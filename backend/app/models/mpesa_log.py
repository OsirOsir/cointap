"""
MpesaLog — single source of truth for every M-Pesa interaction.

One row per STK Push / B2C / refund attempt. Captures:
  - The local request (phone, amount, user)
  - The Daraja identifiers (CheckoutRequestID, MerchantRequestID)
  - The eventual outcome (status, receipt, result code, error message)
  - The raw callback payload (for audit / debugging)

Status lifecycle:
  pending  → STK push sent, waiting for callback (up to ~90s)
  success  → Daraja confirmed payment, wallet credited
  failed   → User cancelled / wrong PIN / insufficient balance / timed out
  expired  → No callback after reconciliation window — gave up

The `reconciled_at` field tracks when the scheduler last queried Daraja
about this log's status (for stuck-pending recovery).
"""
from ..extensions import db
from datetime import datetime, timezone


class MpesaLog(db.Model):
    __tablename__ = "mpesa_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)

    # 'stk_push' (deposit) | 'b2c' (withdrawal — manual for now)
    transaction_type = db.Column(db.String(20), index=True)

    # Daraja identifiers — both come back from the API on success
    checkout_request_id = db.Column(db.String(100), nullable=True, index=True)
    merchant_request_id = db.Column(db.String(100), nullable=True)

    # User and money
    phone = db.Column(db.String(20))
    amount = db.Column(db.Numeric(14, 2))

    # Outcome
    status = db.Column(db.String(20), default="pending", index=True)  # pending|success|failed|expired
    mpesa_receipt = db.Column(db.String(100), nullable=True)
    result_code = db.Column(db.Integer, nullable=True)        # 0 = success, others = various failures
    result_desc = db.Column(db.String(255), nullable=True)    # human-readable Daraja message

    # Audit / debugging
    raw_callback = db.Column(db.Text, nullable=True)

    # Timing
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    reconciled_at = db.Column(db.DateTime, nullable=True)     # Last time we queried Daraja about this

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "transaction_type": self.transaction_type,
            "checkout_request_id": self.checkout_request_id,
            "merchant_request_id": self.merchant_request_id,
            "phone": self.phone,
            "amount": float(self.amount) if self.amount else 0,
            "status": self.status,
            "mpesa_receipt": self.mpesa_receipt,
            "result_code": self.result_code,
            "result_desc": self.result_desc,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def __repr__(self):
        return f"<MpesaLog {self.id} {self.transaction_type} {self.status} Ksh{self.amount}>"
