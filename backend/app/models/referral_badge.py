"""
Referral badge tiers.

Tiers are based on the number of unique users a person has referred. Badges
show TWO counts: total signups (motivating) and invested-only (honest). The
tier itself uses the signup count — same metric users see prominently —
because that's what drives competitive behaviour.

The thresholds are hand-picked to make early wins feel achievable while
keeping the top tiers genuinely aspirational. We expose this from the API
on both /api/referrals/ and /api/auth/me so the frontend never has to
recompute.
"""
from .user import User
from .referral import Referral


# Tier thresholds — (minimum_signup_count, tier_key, label, color)
# Ordered ascending. compute_badge picks the highest tier the user qualifies for.
TIERS = [
    (1,   "bronze",  "Bronze",  "#cd7f32"),
    (5,   "silver",  "Silver",  "#c0c0c0"),
    (15,  "gold",    "Gold",    "#ffd700"),
    (50,  "diamond", "Diamond", "#b9f2ff"),
    (100, "legend",  "Legend",  "#a855f7"),
]


def compute_badge(referrer_id: int, referral_code: str | None) -> dict:
    """Compute badge tier + counts for a single user.

    Returns a dict with:
      - signup_count:   total users signed up with this referral code
      - invested_count: subset who completed first purchase
      - tier:           {key, label, color} of highest unlocked tier (or None)
      - next_tier:      {key, label, threshold, remaining} or None at top tier
    """
    # Total signups — users with promo_code == this user's referral_code
    if not referral_code:
        signup_count = 0
    else:
        signup_count = (
            User.query
            .filter(User.promo_code == referral_code)
            .filter(User.is_active == True)         # exclude suspended users
            .count()
        )

    # Invested — those who actually bought a plan (have a Referral row, status credited)
    invested_count = (
        Referral.query
        .filter_by(referrer_id=referrer_id, status="credited")
        .count()
    )

    # Pick the highest tier this user has unlocked
    unlocked = None
    next_tier = None
    for i, (threshold, key, label, color) in enumerate(TIERS):
        if signup_count >= threshold:
            unlocked = {"key": key, "label": label, "color": color, "threshold": threshold}
        else:
            next_tier = {
                "key": key,
                "label": label,
                "threshold": threshold,
                "remaining": threshold - signup_count,
            }
            break

    return {
        "signup_count": signup_count,
        "invested_count": invested_count,
        "tier": unlocked,
        "next_tier": next_tier,
    }
