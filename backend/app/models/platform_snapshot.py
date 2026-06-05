"""
PlatformSnapshot — one row per day with key platform metrics.

The Analytics tab reads time-series charts from this table. Most metrics
(daily signups, daily deposit volume, daily orders) can be backfilled
retroactively from existing tables. A few (pool balance, total wallet
balance) only have a value going forward — they get written by the daily
scheduler job.

Snapshot date is the START of the UTC day (midnight). One row per date.
"""
from ..extensions import db
from datetime import datetime, timezone, date


class PlatformSnapshot(db.Model):
    __tablename__ = "platform_snapshots"

    id = db.Column(db.Integer, primary_key=True)
    snapshot_date = db.Column(db.Date, unique=True, nullable=False, index=True)

    # Cumulative — totals as of end of snapshot_date
    total_users = db.Column(db.Integer, default=0)
    active_investors = db.Column(db.Integer, default=0)        # users with ≥1 order

    # Daily — actions THIS day only
    new_signups = db.Column(db.Integer, default=0)
    deposits_volume = db.Column(db.Numeric(14, 2), default=0)
    withdrawals_volume = db.Column(db.Numeric(14, 2), default=0)
    orders_count = db.Column(db.Integer, default=0)
    orders_volume = db.Column(db.Numeric(14, 2), default=0)

    # Point-in-time (only writeable forward, not backfillable)
    pool_balance = db.Column(db.Numeric(14, 2), nullable=True)
    total_wallet_balance = db.Column(db.Numeric(14, 2), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "date": self.snapshot_date.isoformat() if self.snapshot_date else None,
            "total_users": self.total_users or 0,
            "active_investors": self.active_investors or 0,
            "new_signups": self.new_signups or 0,
            "deposits_volume": float(self.deposits_volume or 0),
            "withdrawals_volume": float(self.withdrawals_volume or 0),
            "orders_count": self.orders_count or 0,
            "orders_volume": float(self.orders_volume or 0),
            "pool_balance": float(self.pool_balance) if self.pool_balance is not None else None,
            "total_wallet_balance": float(self.total_wallet_balance) if self.total_wallet_balance is not None else None,
        }
