from flask import Blueprint
from flask_jwt_extended import jwt_required
from ..models.referral import Referral
from ..utils.helpers import current_user, ok

referrals_bp = Blueprint("referrals", __name__, url_prefix="/api/referrals")


@referrals_bp.get("/")
@jwt_required()
def list_referrals():
    from ..models.settings import get_settings
    user = current_user()
    refs = Referral.query.filter_by(referrer_id=user.id).order_by(Referral.created_at.desc()).all()
    total_earned = sum(float(r.bonus_amount) for r in refs if r.status == "credited")
    credited_count = sum(1 for r in refs if r.status == "credited")
    pending_count = sum(1 for r in refs if r.status != "credited")

    settings = get_settings()
    threshold = int(settings.referral_milestone_threshold or 0)
    milestone_amount = float(settings.referral_milestone_amount or 0)

    # Build the referrals list with the referred user's display info
    referral_list = []
    for r in refs:
        d = r.to_dict()
        if r.referred_user:
            d["referred_name"] = r.referred_user.full_name
            d["referred_email"] = r.referred_user.email
        referral_list.append(d)

    return ok(
        referrals=referral_list,
        referral_code=user.referral_code,
        total_referrals=len(refs),
        credited_referrals=credited_count,
        pending_referrals=pending_count,
        total_earned=total_earned,
        milestone={
            "threshold": threshold,
            "amount": milestone_amount,
            "achieved": user.milestone_bonus_at is not None,
            "achieved_at": user.milestone_bonus_at.isoformat() if user.milestone_bonus_at else None,
            "progress": min(credited_count, threshold) if threshold > 0 else 0,
            "remaining": max(0, threshold - credited_count) if threshold > 0 and user.milestone_bonus_at is None else 0,
        },
    )
