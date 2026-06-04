import bcrypt
from ..extensions import db
from ..models.user import User
from ..models.wallet import Wallet


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def register_user(full_name: str, email: str, phone: str, password: str, promo_code: str = "") -> dict:
    """Register a new user and initialise their wallet."""
    if User.query.filter_by(email=email.lower()).first():
        return {"ok": False, "error": "Email already registered"}
    if User.query.filter_by(phone=phone).first():
        return {"ok": False, "error": "Phone number already registered"}

    user = User(
        full_name=full_name.strip(),
        email=email.lower().strip(),
        phone=phone.strip(),
        password_hash=hash_password(password),
        promo_code=promo_code.strip() or None,
    )
    db.session.add(user)
    db.session.flush()  # get user.id

    wallet = Wallet(user_id=user.id)
    db.session.add(wallet)
    db.session.commit()

    # When admin has enabled signup-only milestones, a new signup might push
    # the referrer past the threshold immediately (before any investment).
    # Fire the milestone check now — under standard (invested-only) settings
    # this is a cheap no-op that exits early.
    if user.promo_code:
        try:
            from ..models.settings import get_settings
            settings = get_settings()
            if settings.milestone_counts_signups:
                referrer = User.query.filter_by(referral_code=user.promo_code).first()
                if referrer:
                    from .order_service import _maybe_credit_milestone_bonus
                    _maybe_credit_milestone_bonus(referrer)
                    db.session.commit()
        except Exception:
            # Don't let a bonus calculation failure break the signup flow.
            # The user is registered; bonus will fire next time the order
            # service runs for this referrer.
            db.session.rollback()
            db.session.add(user)   # keep the user we just created
            db.session.commit()

    return {"ok": True, "user": user}


def authenticate_user(email: str, password: str) -> dict:
    user = User.query.filter_by(email=email.lower().strip()).first()
    if not user:
        return {"ok": False, "error": "Invalid credentials"}
    if not user.is_active:
        return {"ok": False, "error": "Account is deactivated"}
    if not check_password(password, user.password_hash):
        return {"ok": False, "error": "Invalid credentials"}
    return {"ok": True, "user": user}
