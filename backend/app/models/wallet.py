from ..extensions import db
from datetime import datetime, timezone


class Wallet(db.Model):
    __tablename__ = "wallets"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    balance = db.Column(db.Numeric(14, 2), default=0)
    total_deposited = db.Column(db.Numeric(14, 2), default=0)
    total_withdrawn = db.Column(db.Numeric(14, 2), default=0)
    total_earned = db.Column(db.Numeric(14, 2), default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="wallet")
    transactions = db.relationship("WalletTransaction", back_populates="wallet",
                                   order_by="WalletTransaction.created_at.desc()", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "balance": float(self.balance),
            "total_deposited": float(self.total_deposited),
            "total_withdrawn": float(self.total_withdrawn),
            "total_earned": float(self.total_earned),
        }


TX_TYPES = (
    "deposit", "share_purchase", "maturity_return",
    "referral_bonus", "withdrawal", "withdrawal_reversal", "admin_adjustment",
)


class WalletTransaction(db.Model):
    __tablename__ = "wallet_transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    wallet_id = db.Column(db.Integer, db.ForeignKey("wallets.id"), nullable=False)
    type = db.Column(db.String(30), nullable=False)
    direction = db.Column(db.String(3), nullable=False)   # 'in' | 'out'
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    balance_before = db.Column(db.Numeric(14, 2), nullable=False)
    balance_after = db.Column(db.Numeric(14, 2), nullable=False)
    status = db.Column(db.String(20), default="completed")
    reference = db.Column(db.String(100))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    wallet = db.relationship("Wallet", back_populates="transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "direction": self.direction,
            "amount": float(self.amount),
            "balance_before": float(self.balance_before),
            "balance_after": float(self.balance_after),
            "status": self.status,
            "reference": self.reference,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }
