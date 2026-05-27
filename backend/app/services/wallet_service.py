from decimal import Decimal
from datetime import datetime, timezone
from ..extensions import db
from ..models.wallet import Wallet, WalletTransaction
import random, string


def _ref(prefix: str) -> str:
    return prefix + "-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def credit_wallet(
    wallet: Wallet,
    amount: float,
    tx_type: str,
    description: str = "",
    reference: str = "",
    status: str = "completed",
) -> WalletTransaction:
    """
    Atomically credit a wallet and log the transaction.
    Always call inside a db.session / transaction block.
    """
    amount = Decimal(str(amount))
    before = Decimal(str(wallet.balance))
    after = before + amount

    wallet.balance = after
    if tx_type == "deposit":
        wallet.total_deposited = Decimal(str(wallet.total_deposited)) + amount
    elif tx_type == "maturity_return":
        wallet.total_earned = Decimal(str(wallet.total_earned)) + amount
    elif tx_type == "referral_bonus":
        wallet.total_earned = Decimal(str(wallet.total_earned)) + amount

    tx = WalletTransaction(
        user_id=wallet.user_id,
        wallet_id=wallet.id,
        type=tx_type,
        direction="in",
        amount=amount,
        balance_before=before,
        balance_after=after,
        status=status,
        reference=reference or _ref("TX"),
        description=description,
    )
    db.session.add(tx)
    return tx


def debit_wallet(
    wallet: Wallet,
    amount: float,
    tx_type: str,
    description: str = "",
    reference: str = "",
    status: str = "completed",
) -> WalletTransaction:
    """
    Atomically debit a wallet and log the transaction.
    Raises ValueError if insufficient balance.
    """
    amount = Decimal(str(amount))
    before = Decimal(str(wallet.balance))

    if before < amount:
        raise ValueError("Insufficient wallet balance")

    after = before - amount
    wallet.balance = after
    if tx_type == "withdrawal":
        wallet.total_withdrawn = Decimal(str(wallet.total_withdrawn)) + amount

    tx = WalletTransaction(
        user_id=wallet.user_id,
        wallet_id=wallet.id,
        type=tx_type,
        direction="out",
        amount=amount,
        balance_before=before,
        balance_after=after,
        status=status,
        reference=reference or _ref("TX"),
        description=description,
    )
    db.session.add(tx)
    return tx


def get_or_create_wallet(user_id: int) -> Wallet:
    wallet = Wallet.query.filter_by(user_id=user_id).first()
    if not wallet:
        wallet = Wallet(user_id=user_id)
        db.session.add(wallet)
        db.session.flush()
    return wallet
