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

    # If admin has enabled email verification, send the verification email
    # immediately after signup. We only send when the toggle is ON to save
    # Brevo quota during growth phases. Users registered while OFF will
    # have email_verified=False but can still log in.
    try:
        from ..models.settings import get_settings as _gs
        settings_now = _gs()
        if settings_now.email_verification_required:
            _send_verification_email_for(user, request_ip=None)
        else:
            # Verification is OFF (growth mode) — send welcome NOW since
            # the user can use the platform immediately. We never re-send
            # this welcome later (one-shot via welcome_email_sent_at).
            _send_welcome_email_for(user)
    except Exception:
        # Email send is best-effort; don't block registration on it
        pass

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


def _send_verification_email_for(user, request_ip: str | None = None) -> bool:
    """Issue a fresh verification token and send the magic-link email.

    Safe to call multiple times — each call invalidates older unused tokens
    so the latest email is always the valid one.
    """
    from ..models.email_verification import EmailVerificationToken
    from ..utils.email import send_verification_email
    import os
    raw_token = EmailVerificationToken.issue_for_user(user, request_ip=request_ip)
    frontend_url = os.getenv("FRONTEND_URL", "https://cointap.online").rstrip("/")
    verify_url = f"{frontend_url}/verify-email?token={raw_token}"
    return send_verification_email(
        to_email=user.email,
        full_name=user.full_name,
        verify_url=verify_url,
    )


def _send_welcome_email_for(user) -> bool:
    """Send the welcome email — exactly ONCE per user lifetime.

    Stamped via user.welcome_email_sent_at so a flaky network on first
    attempt doesn't permanently skip the user, but a successful send
    permanently locks it from re-firing later (e.g. if they re-verify).

    Safe to call multiple times: only sends if not previously stamped.
    """
    from ..utils.email import send_welcome_email
    from datetime import datetime, timezone
    if user.welcome_email_sent_at is not None:
        return False   # already sent
    success = send_welcome_email(
        to_email=user.email,
        full_name=user.full_name,
        referral_code=user.referral_code,
    )
    if success:
        user.welcome_email_sent_at = datetime.now(timezone.utc)
        db.session.add(user)
        db.session.commit()
    return success


def authenticate_user(email: str, password: str) -> dict:
    user = User.query.filter_by(email=email.lower().strip()).first()
    if not user:
        return {"ok": False, "error": "Invalid credentials"}
    if not user.is_active:
        return {"ok": False, "error": "Account is deactivated"}
    if not check_password(password, user.password_hash):
        return {"ok": False, "error": "Invalid credentials"}

    # Email verification gate: when admin has flipped the toggle ON, users
    # who signed up AFTER that flip must verify before logging in. Users
    # who signed up before the flip are grandfathered in regardless.
    try:
        from ..models.settings import get_settings
        from datetime import timezone
        settings = get_settings()
        if settings.email_verification_required and not user.email_verified:
            # Grandfathering: only block users who signed up after the flip
            flip_at = settings.verification_required_at
            if flip_at is not None:
                # Make both tz-aware for safe comparison
                user_created = user.created_at
                if user_created.tzinfo is None:
                    user_created = user_created.replace(tzinfo=timezone.utc)
                if flip_at.tzinfo is None:
                    flip_at = flip_at.replace(tzinfo=timezone.utc)
                if user_created >= flip_at:
                    return {
                        "ok": False,
                        "error": "Please verify your email before signing in.",
                        "error_code": "email_not_verified",
                        "email": user.email,
                    }
    except Exception:
        # If anything goes wrong checking the gate, fail open (let them in)
        # rather than locking everyone out due to a bad config read
        pass

    return {"ok": True, "user": user}
