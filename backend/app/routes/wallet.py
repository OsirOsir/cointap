from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from ..services.wallet_service import get_or_create_wallet, credit_wallet, debit_wallet
from ..services.mpesa_service import initiate_stk_push, handle_stk_callback
from ..models.wallet import WalletTransaction
from ..utils.helpers import current_user, err, ok

wallet_bp = Blueprint("wallet", __name__, url_prefix="/api/wallet")


@wallet_bp.get("/")
@jwt_required()
def get_wallet():
    user = current_user()
    wallet = get_or_create_wallet(user.id)
    return ok(wallet=wallet.to_dict())


@wallet_bp.get("/transactions")
@jwt_required()
def get_transactions():
    user = current_user()
    wallet = get_or_create_wallet(user.id)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    q = WalletTransaction.query.filter_by(wallet_id=wallet.id)\
        .order_by(WalletTransaction.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    return ok(
        transactions=[t.to_dict() for t in q.items],
        total=q.total,
        pages=q.pages,
        page=page,
    )


@wallet_bp.post("/deposit/initiate")
@jwt_required()
def deposit_initiate():
    from ..models.settings import get_settings
    settings = get_settings()
    if not settings.deposits_enabled:
        return err("Deposits are temporarily disabled. Please try again later.", 403)
    if settings.maintenance_mode:
        return err("Platform is in maintenance mode. Please check back shortly.", 503)

    user = current_user()
    d = request.get_json() or {}
    amount = float(d.get("amount", 0))
    phone = d.get("phone", user.phone)
    if amount < 10:
        return err("Minimum deposit is Ksh 10")
    result = initiate_stk_push(user.id, phone, amount)
    if not result["ok"]:
        return err(result["error"])
    return ok(message="M-Pesa prompt sent to your phone", checkout_request_id=result["checkout_request_id"])


@wallet_bp.post("/deposit/callback")
def deposit_callback():
    """Public endpoint — called by Safaricom Daraja."""
    payload = request.get_json() or {}
    handle_stk_callback(payload)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


# ────────────────────────────────────────────────────────────────────
# Per-user analytics — for the Dashboard charts
# ────────────────────────────────────────────────────────────────────

@wallet_bp.get("/portfolio-history")
@jwt_required()
def portfolio_history():
    """Hourly snapshot of this user's wallet balance over the last 24h.

    Computed by replaying their wallet_transactions backwards from the
    current balance. No new tables needed — completely derived from
    existing data, always accurate.

    Returns a series of 25 points (00h through 24h):
      [{ "label": "00h", "value": 1500.0 }, ...]
    """
    from datetime import datetime, timezone, timedelta
    from decimal import Decimal
    user = current_user()
    wallet = get_or_create_wallet(user.id)
    now = datetime.now(timezone.utc)
    start = now - timedelta(hours=24)

    # Pull all transactions from the last 24h in chronological order so we
    # can walk forward from the starting balance.
    txs = (WalletTransaction.query
           .filter(WalletTransaction.wallet_id == wallet.id)
           .filter(WalletTransaction.created_at >= start)
           .order_by(WalletTransaction.created_at.asc())
           .all())

    # Reconstruct the balance AT each hour boundary. We start from
    # current balance and subtract future transactions to get past balances,
    # OR easier: sum txs up to each hour and add starting-balance.
    #
    # starting_balance_24h_ago = current_balance - sum_of_txs_in_last_24h
    current = Decimal(str(wallet.balance))
    total_delta = sum((Decimal(str(t.amount)) for t in txs), Decimal(0))
    start_balance = current - total_delta

    # Walk hour by hour, applying each transaction as we cross its timestamp
    points = []
    running = start_balance
    tx_idx = 0
    for hour_offset in range(25):   # 0..24 = 25 points
        boundary = start + timedelta(hours=hour_offset)
        # Apply any transactions that happened before or at this boundary
        while tx_idx < len(txs) and txs[tx_idx].created_at <= boundary:
            running += Decimal(str(txs[tx_idx].amount))
            tx_idx += 1
        points.append({
            "label": f"{hour_offset:02d}h",
            "value": float(running),
        })

    return ok(points=points, current=float(current))


@wallet_bp.get("/earnings-by-day")
@jwt_required()
def earnings_by_day():
    """Daily earnings for the last 7 days. Earnings = maturity returns +
    referral bonuses. Excludes deposits and withdrawals.
    """
    from datetime import datetime, timezone, timedelta, date
    from decimal import Decimal
    user = current_user()
    wallet = get_or_create_wallet(user.id)
    now = datetime.now(timezone.utc)
    today = now.date()
    week_ago = today - timedelta(days=6)   # 7 days inclusive
    start_dt = datetime.combine(week_ago, datetime.min.time(), tzinfo=timezone.utc)

    earning_types = ("maturity_return", "referral_bonus")
    txs = (WalletTransaction.query
           .filter(WalletTransaction.wallet_id == wallet.id)
           .filter(WalletTransaction.type.in_(earning_types))
           .filter(WalletTransaction.created_at >= start_dt)
           .all())

    # Bucket by day (UTC date)
    by_day = {}
    for d_offset in range(7):
        d = week_ago + timedelta(days=d_offset)
        by_day[d.isoformat()] = Decimal(0)

    for tx in txs:
        tx_date = tx.created_at.date().isoformat()
        if tx_date in by_day:
            by_day[tx_date] += Decimal(str(tx.amount))

    # Format as ordered list with short day labels (Mon/Tue/etc)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    points = []
    for d_offset in range(7):
        d = week_ago + timedelta(days=d_offset)
        points.append({
            "label": day_names[d.weekday()],
            "date": d.isoformat(),
            "earned": float(by_day[d.isoformat()]),
        })

    total = sum(p["earned"] for p in points)
    return ok(points=points, total=total)


@wallet_bp.get("/portfolio-allocation")
@jwt_required()
def portfolio_allocation():
    """Breakdown of the user's ACTIVE orders by plan name. Returns segments
    for a donut chart + the absolute amounts.

    For users with no active orders, returns an empty list — the frontend
    shows a "no investments" empty state.
    """
    from ..models.order import Order
    from ..models.plan import Plan
    from decimal import Decimal
    user = current_user()

    # Group active orders by plan
    rows = (Order.query
            .filter(Order.user_id == user.id)
            .filter(Order.status == "Active")
            .all())

    if not rows:
        return ok(segments=[], total=0)

    by_plan: dict[int, dict] = {}
    for o in rows:
        if o.plan_id not in by_plan:
            plan = Plan.query.get(o.plan_id)
            by_plan[o.plan_id] = {
                "plan_id": o.plan_id,
                "name": plan.name if plan else f"Plan #{o.plan_id}",
                "amount": Decimal(0),
                "count": 0,
            }
        by_plan[o.plan_id]["amount"] += Decimal(str(o.amount_invested))
        by_plan[o.plan_id]["count"] += 1

    total = sum(p["amount"] for p in by_plan.values())
    segments = []
    for entry in sorted(by_plan.values(), key=lambda x: -x["amount"]):
        segments.append({
            "plan_id": entry["plan_id"],
            "name": entry["name"],
            "amount": float(entry["amount"]),
            "count": entry["count"],
            "percent": float((entry["amount"] / total) * 100) if total > 0 else 0,
        })

    return ok(segments=segments, total=float(total))
