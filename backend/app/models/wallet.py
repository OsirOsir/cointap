from ..extensions import db
from datetime import datetime, timezone
from decimal import Decimal


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

    def compute_withdrawable_balance(self) -> Decimal:
        """
        Withdrawable balance = sum of all matured returns
                              - sum of withdrawals (paid + pending + processing)
                              + sum of withdrawal_reversals (admin rejected → returned)

        Withdrawals are debited from balance the moment the user requests them,
        so a pending withdrawal must also count against the withdrawable pool —
        otherwise users could queue multiple withdrawals exceeding their
        actual matured returns.

        Deposits, referral bonuses, milestone bonuses, and admin adjustments
        do NOT contribute to withdrawable balance. They become withdrawable
        only after being invested in a plan that matures.
        """
        matured = Decimal("0")
        withdrawals = Decimal("0")
        reversals = Decimal("0")

        for tx in self.transactions:
            amt = Decimal(str(tx.amount))
            if tx.status == "reversed":
                continue  # ignore reversed transactions (refund pair handles it)
            if tx.type == "maturity_return" and tx.direction == "in":
                matured += amt
            elif tx.type == "withdrawal" and tx.direction == "out":
                withdrawals += amt
            elif tx.type == "withdrawal_reversal" and tx.direction == "in":
                reversals += amt

        withdrawable = matured - withdrawals + reversals
        # Clamp at 0 — if math goes negative (pre-feature users), don't punish
        if withdrawable < 0:
            withdrawable = Decimal("0")
        # Also clamp to actual balance — can't withdraw more than they have
        balance = Decimal(str(self.balance))
        if withdrawable > balance:
            withdrawable = balance
        return withdrawable

    def to_dict(self):
        return {
            "balance": float(self.balance),
            "withdrawable_balance": float(self.compute_withdrawable_balance()),
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
