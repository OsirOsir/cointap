from ..extensions import db
from datetime import datetime, timezone


class PoolSettings(db.Model):
    __tablename__ = "pool_settings"

    id = db.Column(db.Integer, primary_key=True)
    public_pool_balance = db.Column(db.Numeric(14, 2), default=2_450_000)
    reserve_pool_balance = db.Column(db.Numeric(14, 2), default=8_000_000)
    sold_out_floor = db.Column(db.Numeric(14, 2), default=50_000)
    batch_release_amount = db.Column(db.Numeric(14, 2), default=500_000)
    auto_replenish_enabled = db.Column(db.Boolean, default=True)
    last_release_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "public_pool_balance": float(self.public_pool_balance),
            "reserve_pool_balance": float(self.reserve_pool_balance),
            "sold_out_floor": float(self.sold_out_floor),
            "batch_release_amount": float(self.batch_release_amount),
            "auto_replenish_enabled": self.auto_replenish_enabled,
            "last_release_at": self.last_release_at.isoformat() if self.last_release_at else None,
        }
