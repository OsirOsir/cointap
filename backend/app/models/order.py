from ..extensions import db
from datetime import datetime, timezone


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey("plans.id"), nullable=False)
    amount_invested = db.Column(db.Numeric(14, 2), nullable=False)
    profit_percent = db.Column(db.Numeric(5, 2), nullable=False)
    expected_return = db.Column(db.Numeric(14, 2), nullable=False)
    status = db.Column(db.String(20), default="Active", index=True)
    # Active | Matured | Settled | Cancelled
    starts_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    matures_at = db.Column(db.DateTime, nullable=False, index=True)
    settled_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="orders")
    plan = db.relationship("Plan", back_populates="orders")

    def to_dict(self):
        return {
            "id": self.id,
            "plan_id": self.plan_id,
            "plan_name": self.plan.name if self.plan else "",
            "amount_invested": float(self.amount_invested),
            "profit_percent": float(self.profit_percent),
            "expected_return": float(self.expected_return),
            "status": self.status,
            "starts_at": self.starts_at.isoformat(),
            "matures_at": self.matures_at.isoformat(),
            "settled_at": self.settled_at.isoformat() if self.settled_at else None,
        }
