"""
Snapshot service.

Two responsibilities:
  1. write_snapshot_for_date(d)  — compute and store one day's snapshot
     row. Idempotent: re-running for the same date just updates the row.
     Used by the scheduler (today's date) and the backfill (historical dates).

  2. backfill_from_existing()    — on first ever boot, fill in historical
     rows by aggregating the existing users/orders/wallet_transactions
     tables. Runs once. Skips re-runs by checking if snapshots already exist.

Design notes:
  - We use UTC dates. Cron runs in UTC on the VPS so dates align.
  - "Daily" metrics use BETWEEN dawn-of-day AND dawn-of-next-day for
    correct DST-free boundaries.
  - "Cumulative" metrics use ≤ end-of-day for accurate point-in-time totals.
  - Pool balance is only stored going forward (we have no historical data
    for it). Old snapshots leave that column NULL.
"""
from datetime import datetime, date, time, timedelta, timezone
from decimal import Decimal
from sqlalchemy import func
from ..extensions import db
from ..models.user import User
from ..models.order import Order
from ..models.wallet import Wallet, WalletTransaction
from ..models.platform_snapshot import PlatformSnapshot
from ..models.pool import PoolSettings


def _utc_day_bounds(d: date):
    """Return (start_dt, end_dt) — UTC midnight bounds for the given day."""
    start = datetime.combine(d, time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start, end


def write_snapshot_for_date(d: date, *, include_point_in_time: bool = False):
    """Compute and write/update the snapshot row for date `d`.

    `include_point_in_time` should be True only for "today" — historical
    backfill doesn't know what pool/wallet balances were on past days.
    """
    start, end = _utc_day_bounds(d)
    end_of_day = end   # exclusive upper bound

    # Cumulative — totals as of end-of-day
    total_users = User.query.filter(User.created_at < end_of_day).count()

    # Active investors — users with at least 1 order, created at any time up to end-of-day
    active_investors = (
        db.session.query(Order.user_id)
        .filter(Order.created_at < end_of_day)
        .distinct()
        .count()
    )

    # Daily — actions in [start, end)
    new_signups = User.query.filter(
        User.created_at >= start, User.created_at < end
    ).count()

    deposits_volume = db.session.query(
        func.coalesce(func.sum(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.type == "deposit",
        WalletTransaction.created_at >= start,
        WalletTransaction.created_at < end,
    ).scalar() or Decimal(0)

    withdrawals_volume = db.session.query(
        func.coalesce(func.sum(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.type == "withdrawal",
        WalletTransaction.created_at >= start,
        WalletTransaction.created_at < end,
    ).scalar() or Decimal(0)
    # Withdrawals are stored as positive amounts in the debit direction —
    # but tx_type makes them clear. We coerce absolute value for charting.
    withdrawals_volume = abs(Decimal(withdrawals_volume))

    daily_orders = Order.query.filter(
        Order.created_at >= start, Order.created_at < end
    ).all()
    orders_count = len(daily_orders)
    orders_volume = sum((Decimal(str(o.amount_invested)) for o in daily_orders), Decimal(0))

    # Point-in-time (only for "today" or live snapshots — don't backfill)
    pool_balance = None
    total_wallet_balance = None
    if include_point_in_time:
        pool = PoolSettings.query.first()
        if pool:
            pool_balance = pool.public_pool_balance
        total_wallet_balance = db.session.query(
            func.coalesce(func.sum(Wallet.balance), 0)
        ).scalar() or Decimal(0)

    # Upsert
    row = PlatformSnapshot.query.filter_by(snapshot_date=d).first()
    if not row:
        row = PlatformSnapshot(snapshot_date=d)
        db.session.add(row)

    row.total_users = total_users
    row.active_investors = active_investors
    row.new_signups = new_signups
    row.deposits_volume = deposits_volume
    row.withdrawals_volume = withdrawals_volume
    row.orders_count = orders_count
    row.orders_volume = orders_volume
    if include_point_in_time:
        row.pool_balance = pool_balance
        row.total_wallet_balance = total_wallet_balance

    db.session.commit()
    return row


def backfill_from_existing(app):
    """One-shot backfill — fills historical snapshot rows by aggregating
    over existing users/orders/wallet_transactions. Only runs if the
    snapshot table is empty.

    Discovers the date range from the earliest row in users/orders and
    iterates day by day up to yesterday. Today's row is created by the
    daily scheduler job, not here.
    """
    with app.app_context():
        if PlatformSnapshot.query.first():
            app.logger.info("[Snapshot] Backfill skipped — snapshots already exist")
            return

        # Find earliest activity date
        first_user_dt = db.session.query(func.min(User.created_at)).scalar()
        first_order_dt = db.session.query(func.min(Order.created_at)).scalar()
        first_tx_dt = db.session.query(func.min(WalletTransaction.created_at)).scalar()

        candidates = [d for d in (first_user_dt, first_order_dt, first_tx_dt) if d]
        if not candidates:
            app.logger.info("[Snapshot] Backfill skipped — no data to backfill")
            return

        earliest = min(candidates).date()
        today_utc = datetime.now(timezone.utc).date()

        # Cap backfill to last 90 days to keep it fast on first boot
        max_days = 90
        if (today_utc - earliest).days > max_days:
            earliest = today_utc - timedelta(days=max_days)

        app.logger.info(f"[Snapshot] Backfilling from {earliest} to {today_utc - timedelta(days=1)}")

        d = earliest
        written = 0
        while d < today_utc:   # exclude today (scheduler handles it)
            write_snapshot_for_date(d, include_point_in_time=False)
            written += 1
            d = d + timedelta(days=1)

        app.logger.info(f"[Snapshot] Backfill complete — {written} day(s) written")


def write_todays_snapshot():
    """Called by the daily scheduler job. Always includes point-in-time
    metrics (current pool balance, total wallet balance).
    """
    today = datetime.now(timezone.utc).date()
    write_snapshot_for_date(today, include_point_in_time=True)
