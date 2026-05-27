from ..extensions import db
from datetime import datetime, timezone


class Plan(db.Model):
    __tablename__ = "plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)
    profit_percent = db.Column(db.Numeric(5, 2), nullable=False)
    min_amount = db.Column(db.Numeric(14, 2), default=500)
    max_amount = db.Column(db.Numeric(14, 2), default=5000)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    orders = db.relationship("Order", back_populates="plan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "duration_days": self.duration_days,
            "profit_percent": float(self.profit_percent),
            "min_amount": float(self.min_amount),
            "max_amount": float(self.max_amount),
            "is_active": self.is_active,
        }
