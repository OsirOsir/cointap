from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
from decimal import Decimal
from ..extensions import db
from ..models.user import User
from ..models.order import Order
from ..models.withdrawal import Withdrawal
from ..models.plan import Plan
from ..models.pool import PoolSettings
from ..models.wallet import WalletTransaction
from ..services.wallet_service import credit_wallet, debit_wallet, get_or_create_wallet
from ..services.mpesa_service import initiate_b2c
from ..utils.helpers import admin_required, err, ok

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/dashboard")
@jwt_required()
@admin_required
def dashboard():
    from sqlalchemy import func
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    active_orders = Order.query.filter_by(status="Active").count()
    settled_orders = Order.query.filter_by(status="Settled").count()
    pending_withdrawals = Withdrawal.query.filter_by(status="Pending").count()

    total_deposited = db.session.query(
        func.sum(WalletTransaction.amount)
    ).filter_by(type="deposit").scalar() or 0

    total_withdrawn = db.session.query(
        func.sum(WalletTransaction.amount)
    ).filter_by(type="withdrawal", status="completed").scalar() or 0

    pool = PoolSettings.query.first()

    return ok(
        stats={
            "total_users": total_users,
            "active_users": active_users,
            "active_orders": active_orders,
            "settled_orders": settled_orders,
            "pending_withdrawals": pending_withdrawals,
            "total_deposited": float(total_deposited),
            "total_withdrawn": float(total_withdrawn),
        },
        pool=pool.to_dict() if pool else None,
    )


# ── Users ───────────────────────────────────────────────

@admin_bp.get("/users")
@jwt_required()
@admin_required
def list_users():
    page = request.args.get("page", 1, type=int)
    search = request.args.get("q", "")
    q = User.query
    if search:
        q = q.filter(
            User.email.ilike(f"%{search}%") |
            User.full_name.ilike(f"%{search}%") |
            User.phone.ilike(f"%{search}%")
        )
    result = q.order_by(User.created_at.desc()).paginate(page=page, per_page=20, error_out=False)
    users = []
    for u in result.items:
        d = u.to_dict()
        d["wallet"] = u.wallet.to_dict() if u.wallet else {}
        d["order_count"] = len(u.orders)
        # Referral counts
        from ..models.referral import Referral
        total_refs = Referral.query.filter_by(referrer_id=u.id).count()
        active_refs = Referral.query.filter_by(referrer_id=u.id, status="credited").count()
        d["referral_count"] = total_refs
        d["active_referral_count"] = active_refs
        users.append(d)
    return ok(users=users, total=result.total, pages=result.pages)


@admin_bp.get("/users/<int:user_id>")
@jwt_required()
@admin_required
def get_user_detail(user_id: int):
    """Full detail for one user — used by admin user-detail modal."""
    from ..models.referral import Referral
    user = User.query.get_or_404(user_id)
    d = user.to_dict()
    d["wallet"] = user.wallet.to_dict() if user.wallet else {}
    d["order_count"] = len(user.orders)

    # All referrals this user has brought in
    refs = Referral.query.filter_by(referrer_id=user.id).all()
    referrals = []
    for r in refs:
        if r.referred_user:
            referrals.append({
                "id": r.id,
                "referred_user_id": r.referred_user_id,
                "referred_name": r.referred_user.full_name,
                "referred_email": r.referred_user.email,
                "status": r.status,
                "bonus_amount": float(r.bonus_amount),
                "created_at": r.created_at.isoformat(),
            })
    d["referrals"] = referrals
    d["referral_count"] = len(referrals)
    d["active_referral_count"] = sum(1 for r in refs if r.status == "credited")
    return ok(user=d)


@admin_bp.put("/users/<int:user_id>/wallet")
@jwt_required()
@admin_required
def adjust_wallet(user_id: int):
    user = User.query.get_or_404(user_id)
    d = request.get_json() or {}
    amount = float(d.get("amount", 0))
    description = d.get("description", "Admin adjustment")
    wallet = get_or_create_wallet(user_id)
    try:
        if amount >= 0:
            credit_wallet(wallet, amount, "admin_adjustment", description)
        else:
            debit_wallet(wallet, abs(amount), "admin_adjustment", description)
        db.session.commit()
        return ok(wallet=wallet.to_dict())
    except ValueError as e:
        db.session.rollback()
        return err(str(e))


@admin_bp.put("/users/<int:user_id>/suspend")
@jwt_required()
@admin_required
def suspend_user(user_id: int):
    """Suspend or unsuspend a user. Toggles their is_active flag."""
    user = User.query.get_or_404(user_id)
    if user.role == "admin":
        return err("Cannot suspend an admin account")
    d = request.get_json() or {}
    # If "active" passed explicitly, use it; otherwise toggle
    if "active" in d:
        user.is_active = bool(d["active"])
    else:
        user.is_active = not user.is_active
    db.session.commit()
    return ok(user=user.to_dict(), suspended=not user.is_active)


@admin_bp.delete("/users/<int:user_id>")
@jwt_required()
@admin_required
def delete_user(user_id: int):
    """Permanently delete a user. Refuses if active orders or pending withdrawals exist."""
    from ..models.order import Order
    from ..models.referral import Referral
    user = User.query.get_or_404(user_id)
    if user.role == "admin":
        return err("Cannot delete an admin account")

    # Safety checks
    active_orders = Order.query.filter(
        Order.user_id == user_id,
        Order.status.in_(["Active", "Matured"]),
    ).count()
    if active_orders > 0:
        return err(
            f"Cannot delete — user has {active_orders} active or unsettled order(s). "
            "Wait for settlement or suspend the account instead."
        )

    pending_wds = Withdrawal.query.filter(
        Withdrawal.user_id == user_id,
        Withdrawal.status.in_(["Pending", "Processing"]),
    ).count()
    if pending_wds > 0:
        return err(
            f"Cannot delete — user has {pending_wds} pending withdrawal(s). "
            "Resolve them first."
        )

    # Cascade: clean up references that don't auto-cascade
    Referral.query.filter(
        (Referral.referrer_id == user_id) | (Referral.referred_user_id == user_id)
    ).delete(synchronize_session=False)

    # Delete wallet (if exists)
    if user.wallet:
        # Wallet transactions cascade via wallet relationship if configured; otherwise:
        from ..models.wallet import WalletTransaction
        WalletTransaction.query.filter_by(wallet_id=user.wallet.id).delete(synchronize_session=False)
        db.session.delete(user.wallet)

    # Delete settled orders too (since their plan_id is just FK to plans, no integrity issue)
    Order.query.filter_by(user_id=user_id).delete(synchronize_session=False)

    email = user.email
    db.session.delete(user)
    db.session.commit()
    return ok(deleted=True, email=email)


# ── Orders ──────────────────────────────────────────────

@admin_bp.get("/orders")
@jwt_required()
@admin_required
def list_orders():
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    q = Order.query
    if status:
        q = q.filter_by(status=status)
    result = q.order_by(Order.created_at.desc()).paginate(page=page, per_page=30, error_out=False)
    orders = []
    for o in result.items:
        d = o.to_dict()
        d["user_id"] = o.user_id
        d["user_name"] = o.user.full_name if o.user else ""
        d["user_email"] = o.user.email if o.user else ""
        orders.append(d)
    return ok(
        orders=orders,
        total=result.total,
        pages=result.pages,
    )


@admin_bp.put("/orders/<int:order_id>/force-mature")
@jwt_required()
@admin_required
def force_mature(order_id: int):
    order = Order.query.get_or_404(order_id)
    if order.status != "Active":
        return err("Order is not Active")
    order.matures_at = datetime.now(timezone.utc)
    db.session.commit()
    # Trigger immediate settlement
    from ..services.order_service import settle_matured_orders
    settle_matured_orders()
    return ok(message="Order force-matured and settled")


# ── Withdrawals ─────────────────────────────────────────

@admin_bp.get("/withdrawals")
@jwt_required()
@admin_required
def list_withdrawals():
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    q = Withdrawal.query
    if status:
        q = q.filter_by(status=status)
    result = q.order_by(Withdrawal.requested_at.desc()).paginate(page=page, per_page=30, error_out=False)
    wds = []
    for w in result.items:
        d = w.to_dict()
        d["user_name"] = w.user.full_name if w.user else ""
        d["user_email"] = w.user.email if w.user else ""
        wds.append(d)
    return ok(withdrawals=wds, total=result.total, pages=result.pages)


@admin_bp.put("/withdrawals/<int:wd_id>/approve")
@jwt_required()
@admin_required
def approve_withdrawal(wd_id: int):
    wd = Withdrawal.query.get_or_404(wd_id)
    if wd.status != "Pending":
        return err("Withdrawal is not Pending")
    # Try B2C
    result = initiate_b2c(wd.id, wd.phone, float(wd.amount))
    wd.status = "Processing"
    wd.processed_at = datetime.now(timezone.utc)
    if not result["ok"]:
        wd.admin_note = result.get("error", "B2C initiation failed")
    db.session.commit()
    return ok(withdrawal=wd.to_dict(), b2c=result)


@admin_bp.put("/withdrawals/<int:wd_id>/reject")
@jwt_required()
@admin_required
def reject_withdrawal(wd_id: int):
    wd = Withdrawal.query.get_or_404(wd_id)
    if wd.status not in ("Pending", "Processing"):
        return err("Cannot reject at this stage")
    # Return funds
    wallet = get_or_create_wallet(wd.user_id)
    credit_wallet(
        wallet, float(wd.amount),
        tx_type="withdrawal_reversal",
        description="Withdrawal rejected — funds returned",
        reference=f"REV-{wd.id}",
    )
    wd.status = "Rejected"
    wd.processed_at = datetime.now(timezone.utc)
    wd.admin_note = (request.get_json(silent=True) or {}).get("reason", "Rejected by admin")
    db.session.commit()
    return ok(withdrawal=wd.to_dict())


# ── Plans ───────────────────────────────────────────────

@admin_bp.post("/plans")
@jwt_required()
@admin_required
def create_plan():
    d = request.get_json() or {}
    required = ["name", "duration_days", "profit_percent"]
    missing = [k for k in required if k not in d or d[k] in (None, "")]
    if missing:
        return err(f"Missing: {', '.join(missing)}")
    try:
        plan = Plan(
            name=str(d["name"]).strip(),
            duration_days=int(d["duration_days"]),
            profit_percent=float(d["profit_percent"]),
            min_amount=float(d.get("min_amount", 500)),
            max_amount=float(d.get("max_amount", 50000)),
            is_active=bool(d.get("is_active", True)),
        )
    except (ValueError, TypeError):
        return err("Invalid number in plan fields")
    if plan.min_amount > plan.max_amount:
        return err("Min amount cannot exceed max amount")
    db.session.add(plan)
    db.session.commit()
    return ok(plan=plan.to_dict()), 201


@admin_bp.put("/plans/<int:plan_id>")
@jwt_required()
@admin_required
def update_plan(plan_id: int):
    plan = Plan.query.get_or_404(plan_id)
    d = request.get_json() or {}
    try:
        if "name" in d: plan.name = str(d["name"]).strip()
        if "duration_days" in d: plan.duration_days = int(d["duration_days"])
        if "profit_percent" in d: plan.profit_percent = float(d["profit_percent"])
        if "min_amount" in d: plan.min_amount = float(d["min_amount"])
        if "max_amount" in d: plan.max_amount = float(d["max_amount"])
        if "is_active" in d: plan.is_active = bool(d["is_active"])
    except (ValueError, TypeError):
        return err("Invalid number in plan fields")
    if float(plan.min_amount) > float(plan.max_amount):
        return err("Min amount cannot exceed max amount")
    db.session.commit()
    return ok(plan=plan.to_dict())


@admin_bp.delete("/plans/<int:plan_id>")
@jwt_required()
@admin_required
def delete_plan(plan_id: int):
    """Delete a plan. Refuses if active orders exist for it (data integrity).
    Suggests deactivating (is_active=false) instead."""
    from ..models.order import Order
    plan = Plan.query.get_or_404(plan_id)
    active_orders = Order.query.filter(
        Order.plan_id == plan_id,
        Order.status.in_(["Active", "Matured"]),
    ).count()
    if active_orders > 0:
        return err(
            f"Cannot delete — {active_orders} active order(s) reference this plan. "
            "Deactivate the plan instead so it stops showing to new users."
        )
    db.session.delete(plan)
    db.session.commit()
    return ok(deleted=True, plan_id=plan_id)


# ── Pool ────────────────────────────────────────────────

@admin_bp.put("/pool")
@jwt_required()
@admin_required
def update_pool():
    pool = PoolSettings.query.first()
    if not pool:
        return err("Pool not found", 404)
    d = request.get_json() or {}
    try:
        for field in ("public_pool_balance", "reserve_pool_balance",
                      "sold_out_floor", "batch_release_amount"):
            if field in d and d[field] not in (None, ""):
                val = float(d[field])
                if val < 0:
                    return err(f"{field} cannot be negative")
                setattr(pool, field, val)
        if "auto_replenish_enabled" in d:
            pool.auto_replenish_enabled = bool(d["auto_replenish_enabled"])
    except (ValueError, TypeError):
        return err("Invalid number in pool fields")
    db.session.commit()
    return ok(pool=pool.to_dict())


@admin_bp.post("/pool/release-batch")
@jwt_required()
@admin_required
def release_batch():
    pool = PoolSettings.query.first()
    if not pool:
        return err("Pool not found", 404)
    batch = min(
        Decimal(str(pool.batch_release_amount)),
        Decimal(str(pool.reserve_pool_balance)),
    )
    if batch <= 0:
        return err("Reserve pool is empty")
    pool.public_pool_balance = Decimal(str(pool.public_pool_balance)) + batch
    pool.reserve_pool_balance = Decimal(str(pool.reserve_pool_balance)) - batch
    pool.last_release_at = datetime.now(timezone.utc)
    db.session.commit()
    return ok(pool=pool.to_dict(), released=float(batch))


# ── Platform Settings ────────────────────────────────────

@admin_bp.get("/settings")
@jwt_required()
@admin_required
def admin_get_settings():
    from ..models.settings import get_settings
    s = get_settings()
    return ok(settings=s.to_dict())


@admin_bp.put("/settings")
@jwt_required()
@admin_required
def admin_update_settings():
    from ..models.settings import get_settings
    s = get_settings()
    d = request.get_json() or {}
    for field in (
        "deposits_enabled",
        "withdrawals_enabled",
        "registrations_open",
        "share_sale_open",
        "maintenance_mode",
    ):
        if field in d:
            setattr(s, field, bool(d[field]))
    if "maintenance_message" in d:
        s.maintenance_message = str(d["maintenance_message"] or "")[:500]
    db.session.commit()
    return ok(settings=s.to_dict())


# ── Order admin controls ─────────────────────────────────

@admin_bp.post("/orders")
@jwt_required()
@admin_required
def admin_create_order():
    """Create an order on behalf of a user. Debits the user's wallet."""
    from ..services.order_service import buy_shares
    d = request.get_json() or {}
    user_id = d.get("user_id")
    plan_id = d.get("plan_id")
    amount = d.get("amount")
    if not user_id or not plan_id or amount is None:
        return err("user_id, plan_id and amount required")
    target = User.query.get(int(user_id))
    if not target:
        return err("User not found", 404)
    result = buy_shares(int(user_id), int(plan_id), float(amount))
    if not result["ok"]:
        return err(result["error"])
    return ok(order=result["order"].to_dict()), 201


@admin_bp.delete("/orders/<int:order_id>")
@jwt_required()
@admin_required
def admin_cancel_order(order_id: int):
    """Cancel an active order and refund the user's wallet."""
    order = Order.query.get_or_404(order_id)
    if order.status not in ("Active", "Matured"):
        return err(f"Cannot cancel an order in '{order.status}' status")
    wallet = get_or_create_wallet(order.user_id)
    refund = float(order.amount_invested)
    credit_wallet(
        wallet, refund,
        tx_type="admin_adjustment",
        description=f"Order #{order.id} cancelled by admin — refund",
        reference=f"CXL-{order.id}",
    )
    order.status = "Cancelled"
    order.settled_at = datetime.now(timezone.utc)
    db.session.commit()
    return ok(order=order.to_dict(), refunded=refund)
