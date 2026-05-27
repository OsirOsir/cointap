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
        users.append(d)
    return ok(users=users, total=result.total, pages=result.pages)


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
    return ok(
        orders=[o.to_dict() for o in result.items],
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
    wd.admin_note = request.get_json({}).get("reason", "Rejected by admin")
    db.session.commit()
    return ok(withdrawal=wd.to_dict())


# ── Plans ───────────────────────────────────────────────

@admin_bp.post("/plans")
@jwt_required()
@admin_required
def create_plan():
    d = request.get_json() or {}
    required = ["name", "duration_days", "profit_percent"]
    missing = [k for k in required if k not in d]
    if missing:
        return err(f"Missing: {', '.join(missing)}")
    plan = Plan(
        name=d["name"],
        duration_days=int(d["duration_days"]),
        profit_percent=float(d["profit_percent"]),
        min_amount=float(d.get("min_amount", 500)),
        max_amount=float(d.get("max_amount", 50000)),
    )
    db.session.add(plan)
    db.session.commit()
    return ok(plan=plan.to_dict()), 201


@admin_bp.put("/plans/<int:plan_id>")
@jwt_required()
@admin_required
def update_plan(plan_id: int):
    plan = Plan.query.get_or_404(plan_id)
    d = request.get_json() or {}
    for field in ("name", "duration_days", "profit_percent", "min_amount", "max_amount", "is_active"):
        if field in d:
            setattr(plan, field, d[field])
    db.session.commit()
    return ok(plan=plan.to_dict())


# ── Pool ────────────────────────────────────────────────

@admin_bp.put("/pool")
@jwt_required()
@admin_required
def update_pool():
    pool = PoolSettings.query.first()
    if not pool:
        return err("Pool not found", 404)
    d = request.get_json() or {}
    for field in ("public_pool_balance", "reserve_pool_balance", "sold_out_floor",
                  "batch_release_amount", "auto_replenish_enabled"):
        if field in d:
            setattr(pool, field, d[field])
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
