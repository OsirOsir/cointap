"""
PlatformSettings — singleton row storing platform-wide feature toggles.

There's always exactly ONE row (id=1). The application uses get_or_create()
to ensure it exists.
"""
from ..extensions import db
from datetime import datetime, timezone


class PlatformSettings(db.Model):
    __tablename__ = "platform_settings"

    id = db.Column(db.Integer, primary_key=True)

    # Feature toggles
    deposits_enabled = db.Column(db.Boolean, default=True, nullable=False)
    withdrawals_enabled = db.Column(db.Boolean, default=True, nullable=False)
    registrations_open = db.Column(db.Boolean, default=True, nullable=False)
    share_sale_open = db.Column(db.Boolean, default=True, nullable=False)
    maintenance_mode = db.Column(db.Boolean, default=False, nullable=False)
    # Careers — when False, /apply shows "applications closed" instead of form
    careers_open = db.Column(db.Boolean, default=True, nullable=False)

    # When True, milestone bonus counts ALL signups using the user's referral
    # code (regardless of whether they've invested). Designed for early growth
    # campaigns. Admin can flip OFF later to revert to standard "invested-only"
    # counting. Flipping does NOT retroactively reverse already-paid bonuses.
    milestone_counts_signups = db.Column(db.Boolean, default=False, nullable=False)

    # When True, new signups must verify their email before they can log in.
    # Tracked with a "flipped at" timestamp so existing users from before
    # the flip aren't affected — they grandfather in.
    email_verification_required = db.Column(db.Boolean, default=False, nullable=False)
    verification_required_at = db.Column(db.DateTime, nullable=True)

    # Referral milestone bonus — pays user a one-time bonus when they reach
    # a threshold of credited (real-purchase-backed) referrals.
    referral_milestone_threshold = db.Column(db.Integer, default=10, nullable=False)
    referral_milestone_amount = db.Column(db.Numeric(14, 2), default=100, nullable=False)

    # Optional message shown alongside maintenance banner
    maintenance_message = db.Column(
        db.Text,
        default="The platform is undergoing scheduled maintenance. Please check back shortly.",
    )

    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "deposits_enabled": bool(self.deposits_enabled),
            "withdrawals_enabled": bool(self.withdrawals_enabled),
            "registrations_open": bool(self.registrations_open),
            "share_sale_open": bool(self.share_sale_open),
            "maintenance_mode": bool(self.maintenance_mode),
            "maintenance_message": self.maintenance_message or "",
            "careers_open": bool(self.careers_open),
            "milestone_counts_signups": bool(self.milestone_counts_signups),
            "email_verification_required": bool(self.email_verification_required),
            "verification_required_at": self.verification_required_at.isoformat() if self.verification_required_at else None,
            "referral_milestone_threshold": int(self.referral_milestone_threshold or 0),
            "referral_milestone_amount": float(self.referral_milestone_amount or 0),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


def get_settings() -> PlatformSettings:
    """Return the single settings row, creating it on first call."""
    settings = PlatformSettings.query.first()
    if not settings:
        settings = PlatformSettings()
        db.session.add(settings)
        db.session.commit()
    return settings
