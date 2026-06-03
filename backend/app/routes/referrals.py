from flask import Blueprint
from flask_jwt_extended import jwt_required
from ..models.referral import Referral
from ..models.user import User
from ..utils.helpers import current_user, ok

referrals_bp = Blueprint("referrals", __name__, url_prefix="/api/referrals")


@referrals_bp.get("/")
@jwt_required()
def list_referrals():
    from ..models.settings import get_settings
    user = current_user()

    # ─── 1. "Active" referrals — those who've bought at least one plan.
    # The Referral table only gets a row when the referred user makes their
    # first purchase (this is what triggers the 3% bonus payout).
    refs = Referral.query.filter_by(referrer_id=user.id).order_by(Referral.created_at.desc()).all()
    total_earned = sum(float(r.bonus_amount) for r in refs if r.status == "credited")
    credited_count = sum(1 for r in refs if r.status == "credited")
    pending_count = sum(1 for r in refs if r.status != "credited")

    # ─── 2. "Pending" referrals — users who signed up with my code but
    # haven't invested yet. These don't have a Referral row, so we have to
    # look them up via User.promo_code (where we save the referrer's code
    # at signup time).
    referred_user_ids = {r.referred_user_id for r in refs}
    pending_q = User.query.filter(User.promo_code == user.referral_code)
    if referred_user_ids:
        pending_q = pending_q.filter(~User.id.in_(referred_user_ids))
    pending_signups = pending_q.order_by(User.created_at.desc()).all()

    # Combine totals
    total_referrals = len(refs) + len(pending_signups)

    # Build the unified referral list — invested users first, then signup-only.
    referral_list = []
    for r in refs:
        d = r.to_dict()
        if r.referred_user:
            d["referred_name"] = r.referred_user.full_name
            d["referred_email"] = r.referred_user.email
            d["joined_at"] = r.referred_user.created_at.isoformat() if r.referred_user.created_at else None
        d["has_invested"] = True
        referral_list.append(d)

    for u in pending_signups:
        referral_list.append({
            "id": None,                   # no Referral row yet
            "referred_user_id": u.id,
            "referred_name": u.full_name,
            "referred_email": u.email,
            "joined_at": u.created_at.isoformat() if u.created_at else None,
            "bonus_amount": 0,
            "status": "signed_up",        # signed up but hasn't invested
            "has_invested": False,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    settings = get_settings()
    threshold = int(settings.referral_milestone_threshold or 0)
    milestone_amount = float(settings.referral_milestone_amount or 0)

    return ok(
        referrals=referral_list,
        referral_code=user.referral_code,
        total_referrals=total_referrals,             # signed up + invested
        active_referrals=credited_count,             # NEW: invested count
        credited_referrals=credited_count,           # kept for backwards compat
        pending_referrals=pending_count + len(pending_signups),
        signup_only_referrals=len(pending_signups),  # NEW: signed up but not invested
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
