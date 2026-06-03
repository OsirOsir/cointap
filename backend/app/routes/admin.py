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
        # Referral counts:
        #   total_referrals  = everyone who signed up with my code (invested or not)
        #   active_referrals = subset who actually invested (have a Referral row)
        from ..models.referral import Referral
        active_refs = Referral.query.filter_by(referrer_id=u.id, status="credited").count()
        signup_refs = User.query.filter_by(promo_code=u.referral_code).count() if u.referral_code else 0
        d["referral_count"] = signup_refs
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
    referred_ids = set()
    for r in refs:
        if r.referred_user:
            referred_ids.add(r.referred_user_id)
            referrals.append({
                "id": r.id,
                "referred_user_id": r.referred_user_id,
                "referred_name": r.referred_user.full_name,
                "referred_email": r.referred_user.email,
                "status": r.status,
                "has_invested": True,
                "bonus_amount": float(r.bonus_amount),
                "created_at": r.created_at.isoformat(),
            })

    # Also include signups that haven't invested yet (no Referral row)
    if user.referral_code:
        signup_only = (
            User.query
            .filter(User.promo_code == user.referral_code)
            .filter(~User.id.in_(referred_ids) if referred_ids else User.id.isnot(None))
            .all()
        )
        for u in signup_only:
            referrals.append({
                "id": None,
                "referred_user_id": u.id,
                "referred_name": u.full_name,
                "referred_email": u.email,
                "status": "signed_up",
                "has_invested": False,
                "bonus_amount": 0,
                "created_at": u.created_at.isoformat() if u.created_at else None,
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
    # Referral milestone bonus controls
    if "referral_milestone_threshold" in d:
        try:
            t = int(d["referral_milestone_threshold"])
            if t < 0:
                return err("Threshold cannot be negative")
            s.referral_milestone_threshold = t
        except (ValueError, TypeError):
            return err("Threshold must be a whole number")
    if "referral_milestone_amount" in d:
        try:
            a = float(d["referral_milestone_amount"])
            if a < 0:
                return err("Amount cannot be negative")
            s.referral_milestone_amount = a
        except (ValueError, TypeError):
            return err("Amount must be a number")
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


# ── Announcements ────────────────────────────────────────

@admin_bp.get("/announcements")
@jwt_required()
@admin_required
def admin_list_announcements():
    from ..models.announcement import Announcement
    items = Announcement.query.order_by(Announcement.created_at.desc()).all()
    return ok(announcements=[a.to_dict() for a in items])


@admin_bp.post("/announcements")
@jwt_required()
@admin_required
def admin_create_announcement():
    from ..models.announcement import Announcement
    d = request.get_json() or {}
    title = (d.get("title") or "").strip()
    message = (d.get("message") or "").strip()
    type_ = (d.get("type") or "info").strip()
    if not title:
        return err("Title is required")
    if not message:
        return err("Message is required")
    if type_ not in ("info", "success", "warning", "critical"):
        return err("Type must be one of: info, success, warning, critical")
    a = Announcement(
        title=title[:120],
        message=message,
        type=type_,
        is_active=bool(d.get("is_active", True)),
    )
    db.session.add(a)
    db.session.commit()
    return ok(announcement=a.to_dict()), 201


@admin_bp.put("/announcements/<int:ann_id>")
@jwt_required()
@admin_required
def admin_update_announcement(ann_id: int):
    from ..models.announcement import Announcement
    a = Announcement.query.get_or_404(ann_id)
    d = request.get_json() or {}
    if "title" in d:
        title = (d.get("title") or "").strip()
        if not title:
            return err("Title cannot be empty")
        a.title = title[:120]
    if "message" in d:
        message = (d.get("message") or "").strip()
        if not message:
            return err("Message cannot be empty")
        a.message = message
    if "type" in d:
        type_ = (d.get("type") or "info").strip()
        if type_ not in ("info", "success", "warning", "critical"):
            return err("Type must be one of: info, success, warning, critical")
        a.type = type_
    if "is_active" in d:
        a.is_active = bool(d["is_active"])
    db.session.commit()
    return ok(announcement=a.to_dict())


@admin_bp.delete("/announcements/<int:ann_id>")
@jwt_required()
@admin_required
def admin_delete_announcement(ann_id: int):
    from ..models.announcement import Announcement
    a = Announcement.query.get_or_404(ann_id)
    db.session.delete(a)
    db.session.commit()
    return ok(deleted=True, id=ann_id)


# ── Chat (admin side) ────────────────────────────────────

@admin_bp.get("/chat/conversations")
@jwt_required()
@admin_required
def admin_list_conversations():
    """List all conversations sorted by latest activity.
    Supports ?status=open|closed|all (default 'open') and ?q=search."""
    from ..models.chat import Conversation
    status = request.args.get("status", "open")
    q_str = (request.args.get("q") or "").strip()

    q = Conversation.query
    if status in ("open", "closed"):
        q = q.filter_by(status=status)
    # 'all' → no filter

    if q_str:
        like = f"%{q_str}%"
        # Search across visitor_name, visitor_email, and joined user fields
        q = q.outerjoin(User, Conversation.user_id == User.id).filter(
            db.or_(
                Conversation.visitor_name.ilike(like),
                Conversation.visitor_email.ilike(like),
                User.full_name.ilike(like),
                User.email.ilike(like),
            )
        )

    convs = q.order_by(Conversation.last_message_at.desc()).limit(200).all()
    return ok(conversations=[c.to_dict() for c in convs])


@admin_bp.get("/chat/conversations/<int:conv_id>")
@jwt_required()
@admin_required
def admin_get_conversation(conv_id: int):
    """Full thread + lightweight user context for admin UI."""
    from ..models.chat import Conversation
    conv = Conversation.query.get_or_404(conv_id)
    d = conv.to_dict(include_messages=True)
    # Inject context if logged-in user
    if conv.user:
        u = conv.user
        d["user_context"] = {
            "id": u.id,
            "email": u.email,
            "phone": u.phone,
            "is_active": u.is_active,
            "role": u.role,
            "referral_code": u.referral_code,
            "wallet": u.wallet.to_dict() if u.wallet else None,
        }
    else:
        d["user_context"] = None
    return ok(conversation=d)


@admin_bp.post("/chat/conversations/<int:conv_id>/reply")
@jwt_required()
@admin_required
def admin_reply(conv_id: int):
    from ..models.chat import Conversation, ChatMessage
    conv = Conversation.query.get_or_404(conv_id)
    if conv.status != "open":
        return err("This conversation is closed. Reopen it first.", 400)

    d = request.get_json() or {}
    body = (d.get("body") or "").strip()
    if not body:
        return err("Reply body cannot be empty")
    if len(body) > 2000:
        return err("Reply too long (max 2000 chars)")

    msg = ChatMessage(conversation_id=conv.id, sender="admin", body=body)
    db.session.add(msg)
    conv.last_message_at = msg.created_at or datetime.now(timezone.utc)
    conv.unread_user = (conv.unread_user or 0) + 1
    # When admin replies, they've now seen all user messages
    conv.unread_admin = 0
    db.session.commit()
    return ok(message=msg.to_dict())


@admin_bp.post("/chat/conversations/<int:conv_id>/read")
@jwt_required()
@admin_required
def admin_mark_read(conv_id: int):
    from ..models.chat import Conversation
    conv = Conversation.query.get_or_404(conv_id)
    conv.unread_admin = 0
    db.session.commit()
    return ok(ok=True)


@admin_bp.post("/chat/conversations/<int:conv_id>/close")
@jwt_required()
@admin_required
def admin_close(conv_id: int):
    from ..models.chat import Conversation, ChatMessage
    conv = Conversation.query.get_or_404(conv_id)
    if conv.status == "closed":
        return ok(conversation=conv.to_dict())
    conv.status = "closed"
    db.session.add(ChatMessage(
        conversation_id=conv.id,
        sender="system",
        body="Conversation closed by admin.",
    ))
    db.session.commit()
    return ok(conversation=conv.to_dict())


@admin_bp.post("/chat/conversations/<int:conv_id>/reopen")
@jwt_required()
@admin_required
def admin_reopen(conv_id: int):
    from ..models.chat import Conversation, ChatMessage
    conv = Conversation.query.get_or_404(conv_id)
    if conv.status == "open":
        return ok(conversation=conv.to_dict())
    conv.status = "open"
    db.session.add(ChatMessage(
        conversation_id=conv.id,
        sender="system",
        body="Conversation reopened by admin.",
    ))
    db.session.commit()
    return ok(conversation=conv.to_dict())


@admin_bp.get("/chat/unread-count")
@jwt_required()
@admin_required
def admin_chat_unread():
    """Returns total unread messages across all conversations.
    Used for badge in admin sidebar."""
    from ..models.chat import Conversation
    total = db.session.query(db.func.coalesce(db.func.sum(Conversation.unread_admin), 0)).scalar() or 0
    open_count = Conversation.query.filter_by(status="open").count()
    return ok(unread=int(total), open_conversations=int(open_count))
