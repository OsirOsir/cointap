from ..extensions import db
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import JSONB


class MpesaLog(db.Model):
    __tablename__ = "mpesa_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    transaction_type = db.Column(db.String(20))   # stk_push | b2c
    checkout_request_id = db.Column(db.String(100), nullable=True, index=True)
    mpesa_receipt = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20))
    amount = db.Column(db.Numeric(14, 2))
    status = db.Column(db.String(20), default="pending")  # pending | success | failed
    raw_callback = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_type": self.transaction_type,
            "checkout_request_id": self.checkout_request_id,
            "mpesa_receipt": self.mpesa_receipt,
            "phone": self.phone,
            "amount": float(self.amount) if self.amount else 0,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }
