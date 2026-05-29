from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
from ..extensions import db
from ..models.withdrawal import Withdrawal
from ..services.wallet_service import debit_wallet, get_or_create_wallet
from ..utils.helpers import current_user, err, ok
from flask import current_app

withdrawals_bp = Blueprint("withdrawals", __name__, url_prefix="/api/withdrawals")


@withdrawals_bp.post("/request")
@jwt_required()
def request_withdrawal():
    from ..models.settings import get_settings
    settings = get_settings()
    if not settings.withdrawals_enabled:
        return err("Withdrawals are temporarily disabled. Please try again later.", 403)
    if settings.maintenance_mode:
        return err("Platform is in maintenance mode. Please check back shortly.", 503)

    user = current_user()
    d = request.get_json() or {}
    amount = float(d.get("amount", 0))
    phone = d.get("phone", "").strip()

    min_wd = float(current_app.config.get("MIN_WITHDRAWAL", 200))
    if amount < min_wd:
        return err(f"Minimum withdrawal is Ksh {min_wd:,.0f}")
    if not phone:
        return err("Phone number required")

    wallet = get_or_create_wallet(user.id)
    try:
        debit_wallet(
            wallet, amount,
            tx_type="withdrawal",
            description=f"Withdrawal to {phone}",
            status="pending",
        )
        wd = Withdrawal(user_id=user.id, amount=amount, phone=phone)
        db.session.add(wd)
        db.session.commit()
        return ok(withdrawal=wd.to_dict()), 201
    except ValueError as e:
        db.session.rollback()
        return err(str(e))


@withdrawals_bp.get("/")
@jwt_required()
def list_withdrawals():
    user = current_user()
    wds = Withdrawal.query.filter_by(user_id=user.id).order_by(Withdrawal.requested_at.desc()).all()
    return ok(withdrawals=[w.to_dict() for w in wds])
