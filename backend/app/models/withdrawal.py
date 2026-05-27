from ..extensions import db
from datetime import datetime, timezone


class Withdrawal(db.Model):
    __tablename__ = "withdrawals"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default="Pending", index=True)
    # Pending | Processing | Paid | Rejected
    mpesa_reference = db.Column(db.String(100), nullable=True)
    admin_note = db.Column(db.Text, nullable=True)
    requested_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", back_populates="withdrawals")

    def to_dict(self):
        return {
            "id": self.id,
            "amount": float(self.amount),
            "phone": self.phone,
            "status": self.status,
            "mpesa_reference": self.mpesa_reference,
            "admin_note": self.admin_note,
            "requested_at": self.requested_at.isoformat(),
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }
