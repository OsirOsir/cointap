from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from ..services.wallet_service import get_or_create_wallet, credit_wallet, debit_wallet
from ..services.mpesa_service import initiate_stk_push, handle_stk_callback
from ..models.wallet import WalletTransaction
from ..utils.helpers import current_user, err, ok

wallet_bp = Blueprint("wallet", __name__, url_prefix="/api/wallet")


@wallet_bp.get("/")
@jwt_required()
def get_wallet():
    user = current_user()
    wallet = get_or_create_wallet(user.id)
    return ok(wallet=wallet.to_dict())


@wallet_bp.get("/transactions")
@jwt_required()
def get_transactions():
    user = current_user()
    wallet = get_or_create_wallet(user.id)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    q = WalletTransaction.query.filter_by(wallet_id=wallet.id)\
        .order_by(WalletTransaction.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    return ok(
        transactions=[t.to_dict() for t in q.items],
        total=q.total,
        pages=q.pages,
        page=page,
    )


@wallet_bp.post("/deposit/initiate")
@jwt_required()
def deposit_initiate():
    from ..models.settings import get_settings
    settings = get_settings()
    if not settings.deposits_enabled:
        return err("Deposits are temporarily disabled. Please try again later.", 403)
    if settings.maintenance_mode:
        return err("Platform is in maintenance mode. Please check back shortly.", 503)

    user = current_user()
    d = request.get_json() or {}
    amount = float(d.get("amount", 0))
    phone = d.get("phone", user.phone)
    if amount < 10:
        return err("Minimum deposit is Ksh 10")
    result = initiate_stk_push(user.id, phone, amount)
    if not result["ok"]:
        return err(result["error"])
    return ok(message="M-Pesa prompt sent to your phone", checkout_request_id=result["checkout_request_id"])


@wallet_bp.post("/deposit/callback")
def deposit_callback():
    """Public endpoint — called by Safaricom Daraja."""
    payload = request.get_json() or {}
    handle_stk_callback(payload)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}
