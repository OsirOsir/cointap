from flask import Blueprint
from flask_jwt_extended import jwt_required
from ..models.referral import Referral
from ..utils.helpers import current_user, ok

referrals_bp = Blueprint("referrals", __name__, url_prefix="/api/referrals")


@referrals_bp.get("/")
@jwt_required()
def list_referrals():
    user = current_user()
    refs = Referral.query.filter_by(referrer_id=user.id).order_by(Referral.created_at.desc()).all()
    total_earned = sum(float(r.bonus_amount) for r in refs if r.status == "credited")
    return ok(
        referrals=[r.to_dict() for r in refs],
        referral_code=user.referral_code,
        total_referrals=len(refs),
        total_earned=total_earned,
    )
