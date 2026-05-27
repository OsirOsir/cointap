from ..extensions import db
from datetime import datetime, timezone


class Referral(db.Model):
    __tablename__ = "referrals"

    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    referred_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    first_purchase_order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=True)
    bonus_amount = db.Column(db.Numeric(14, 2), default=0)
    status = db.Column(db.String(20), default="pending")  # pending | credited
    credited_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    referrer = db.relationship("User", foreign_keys=[referrer_id])
    referred_user = db.relationship("User", foreign_keys=[referred_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "referrer_id": self.referrer_id,
            "referred_user_id": self.referred_user_id,
            "bonus_amount": float(self.bonus_amount),
            "status": self.status,
            "credited_at": self.credited_at.isoformat() if self.credited_at else None,
            "created_at": self.created_at.isoformat(),
        }
