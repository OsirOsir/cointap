from ..extensions import db
from datetime import datetime, timezone
import random, string


def _gen_code():
    return "CT" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    referral_code = db.Column(db.String(20), unique=True, nullable=False, default=_gen_code)
    promo_code = db.Column(db.String(20), nullable=True)   # referral code they used at signup
    role = db.Column(db.String(10), default="user")        # 'user' | 'admin'
    is_active = db.Column(db.Boolean, default=True)
    # Email verification — when False and platform has verification gating
    # enabled, the user cannot log in until they verify via the email link.
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    # Set when the user has been awarded the referral-milestone bonus (one-shot)
    milestone_bonus_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    wallet = db.relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    orders = db.relationship("Order", back_populates="user", cascade="all, delete-orphan")
    withdrawals = db.relationship("Withdrawal", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "referral_code": self.referral_code,
            "promo_code": self.promo_code,
            "role": self.role,
            "is_active": self.is_active,
            "email_verified": bool(self.email_verified),
            "created_at": self.created_at.isoformat(),
        }
