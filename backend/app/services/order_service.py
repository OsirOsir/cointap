from decimal import Decimal
from datetime import datetime, timezone, timedelta
from ..extensions import db
from ..models.order import Order
from ..models.plan import Plan
from ..models.pool import PoolSettings
from ..models.referral import Referral
from .wallet_service import credit_wallet, debit_wallet, get_or_create_wallet
import random, string


def _ref(prefix: str) -> str:
    return prefix + "-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def buy_shares(user_id: int, plan_id: int, amount: float) -> dict:
    """
    Core share purchase flow.
    1. Validate plan and amount
    2. Check wallet balance
    3. Check pool availability
    4. Deduct wallet + pool atomically
    5. Create order
    6. Apply referral bonus if first purchase
    Returns {"ok": True, "order": order} or {"ok": False, "error": str}
    """
    plan = Plan.query.get(plan_id)
    if not plan or not plan.is_active:
        return {"ok": False, "error": "Plan not available"}

    amount = Decimal(str(amount))
    if amount < plan.min_amount:
        return {"ok": False, "error": f"Minimum investment is Ksh {plan.min_amount:,.0f}"}
    if amount > plan.max_amount:
        return {"ok": False, "error": f"Maximum investment is Ksh {plan.max_amount:,.0f}"}

    wallet = get_or_create_wallet(user_id)
    if Decimal(str(wallet.balance)) < amount:
        return {"ok": False, "error": "Insufficient wallet balance. Please deposit first."}

    pool = PoolSettings.query.first()
    if not pool or Decimal(str(pool.public_pool_balance)) < amount:
        return {"ok": False, "error": "Share pool is sold out. Please wait for next batch."}

    expected = amount + (amount * Decimal(str(plan.profit_percent)) / 100)
    now = datetime.now(timezone.utc)
    matures_at = now + timedelta(days=int(plan.duration_days))

    try:
        # Deduct wallet
        debit_wallet(
            wallet, float(amount),
            tx_type="share_purchase",
            description=f"Purchase — {plan.name}",
            reference=_ref("ORD"),
        )

        # Deduct pool
        pool.public_pool_balance = Decimal(str(pool.public_pool_balance)) - amount

        # Create order
        order = Order(
            user_id=user_id,
            plan_id=plan_id,
            amount_invested=amount,
            profit_percent=plan.profit_percent,
            expected_return=expected,
            status="Active",
            starts_at=now,
            matures_at=matures_at,
        )
        db.session.add(order)
        db.session.flush()

        # Referral bonus on first purchase
        _maybe_credit_referral_bonus(user_id, order.id, float(amount))

        db.session.commit()
        return {"ok": True, "order": order}

    except Exception as e:
        db.session.rollback()
        return {"ok": False, "error": str(e)}


def settle_matured_orders() -> int:
    """Called by scheduler every minute. Returns count of settled orders."""
    now = datetime.now(timezone.utc)
    matured = Order.query.filter(
        Order.status == "Active",
        Order.matures_at <= now,
    ).all()

    count = 0
    for order in matured:
        try:
            wallet = get_or_create_wallet(order.user_id)
            credit_wallet(
                wallet,
                float(order.expected_return),
                tx_type="maturity_return",
                description=f"Maturity Return — {order.plan.name}",
                reference=_ref("MAT"),
            )
            order.status = "Settled"
            order.settled_at = now

            # Return to pool
            pool = PoolSettings.query.first()
            if pool:
                pool.public_pool_balance = (
                    Decimal(str(pool.public_pool_balance)) + Decimal(str(order.expected_return))
                )

            db.session.commit()
            count += 1
        except Exception:
            db.session.rollback()

    return count


def _maybe_credit_referral_bonus(user_id: int, order_id: int, amount: float):
    """Credit referrer if this is the referred user's first purchase."""
    from ..models.user import User
    from flask import current_app

    user = User.query.get(user_id)
    if not user or not user.promo_code:
        return

    # Only on first purchase
    prior = Order.query.filter(
        Order.user_id == user_id,
        Order.status.in_(["Active", "Matured", "Settled"]),
    ).count()
    if prior > 1:
        return

    referrer = User.query.filter_by(referral_code=user.promo_code).first()
    if not referrer or referrer.id == user_id:
        return

    # Already credited?
    existing = Referral.query.filter_by(
        referrer_id=referrer.id, referred_user_id=user_id
    ).first()
    if existing and existing.status == "credited":
        return

    bonus_pct = float(current_app.config.get("REFERRAL_BONUS_PERCENT", 3))
    bonus = Decimal(str(round(amount * bonus_pct / 100, 2)))

    ref = existing or Referral(referrer_id=referrer.id, referred_user_id=user_id)
    ref.first_purchase_order_id = order_id
    ref.bonus_amount = bonus
    ref.status = "credited"
    ref.credited_at = datetime.now(timezone.utc)
    db.session.add(ref)

    referrer_wallet = get_or_create_wallet(referrer.id)
    credit_wallet(
        referrer_wallet,
        float(bonus),
        tx_type="referral_bonus",
        description=f"Referral bonus — {user.full_name}",
        reference=_ref("REF"),
    )

    # Check whether this credit pushed the referrer to a milestone bonus
    _maybe_credit_milestone_bonus(referrer)


def _maybe_credit_milestone_bonus(referrer):
    """If the referrer has hit the configured threshold AND hasn't been
    awarded the milestone bonus before, credit them.

    One-shot per user — tracked by user.milestone_bonus_at.
    """
    from ..models.user import User
    from ..models.settings import get_settings

    if referrer.milestone_bonus_at is not None:
        return  # already awarded

    settings = get_settings()
    threshold = int(settings.referral_milestone_threshold or 0)
    amount = float(settings.referral_milestone_amount or 0)
    if threshold <= 0 or amount <= 0:
        return

    credited_count = Referral.query.filter_by(
        referrer_id=referrer.id, status="credited"
    ).count()

    if credited_count < threshold:
        return

    # Award it
    wallet = get_or_create_wallet(referrer.id)
    credit_wallet(
        wallet,
        amount,
        tx_type="referral_bonus",
        description=f"🎁 Milestone bonus — {threshold} successful referrals",
        reference=_ref("MILE"),
    )
    referrer.milestone_bonus_at = datetime.now(timezone.utc)
    db.session.add(referrer)
