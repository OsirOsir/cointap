from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
)
from ..services.auth_service import register_user, authenticate_user, check_password, hash_password
from ..models.user import User
from ..extensions import db
from ..utils.helpers import current_user, err, ok
import re

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^\+?\d{9,15}$")


@auth_bp.post("/register")
def register():
    from ..models.settings import get_settings
    settings = get_settings()
    if not settings.registrations_open:
        return err("New registrations are currently closed. Check back soon.", 403)
    if settings.maintenance_mode:
        return err("Platform is in maintenance mode. Please check back shortly.", 503)

    d = request.get_json() or {}
    required = ["full_name", "email", "phone", "password"]
    missing = [k for k in required if not d.get(k)]
    if missing:
        return err(f"Missing fields: {', '.join(missing)}")

    result = register_user(
        full_name=d["full_name"],
        email=d["email"],
        phone=d["phone"],
        password=d["password"],
        promo_code=d.get("promo_code", ""),
    )
    if not result["ok"]:
        return err(result["error"])

    user = result["user"]
    return ok(
        user=user.to_dict(),
        access_token=create_access_token(identity=str(user.id)),
        refresh_token=create_refresh_token(identity=str(user.id)),
    ), 201


@auth_bp.post("/login")
def login():
    d = request.get_json() or {}
    if not d.get("email") or not d.get("password"):
        return err("Email and password required")

    result = authenticate_user(d["email"], d["password"])
    if not result["ok"]:
        return err(result["error"], 401)

    user = result["user"]
    return ok(
        user=user.to_dict(),
        access_token=create_access_token(identity=str(user.id)),
        refresh_token=create_refresh_token(identity=str(user.id)),
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    return ok(access_token=create_access_token(identity=str(user_id)))


@auth_bp.get("/me")
@jwt_required()
def me():
    user = current_user()
    if not user:
        return err("User not found", 404)
    # Include badge tier so the frontend can show it on Profile/Dashboard
    # without making a separate referrals call.
    from ..models.referral_badge import compute_badge
    user_dict = user.to_dict()
    user_dict["badge"] = compute_badge(user.id, user.referral_code)
    return ok(user=user_dict)


@auth_bp.put("/me")
@jwt_required()
def update_me():
    """Update name / email / phone. Each field validated; email and phone must be unique."""
    user = current_user()
    if not user:
        return err("User not found", 404)
    d = request.get_json() or {}

    # Full name
    if "full_name" in d:
        name = (d.get("full_name") or "").strip()
        if len(name) < 2:
            return err("Name must be at least 2 characters")
        user.full_name = name

    # Email — validate format + uniqueness
    if "email" in d:
        new_email = (d.get("email") or "").strip().lower()
        if not EMAIL_RE.match(new_email):
            return err("Invalid email address")
        if new_email != user.email:
            taken = User.query.filter(User.email == new_email, User.id != user.id).first()
            if taken:
                return err("Email already in use")
            user.email = new_email

    # Phone — validate format + uniqueness
    if "phone" in d:
        new_phone = (d.get("phone") or "").strip()
        if not PHONE_RE.match(new_phone.replace(" ", "")):
            return err("Invalid phone number")
        if new_phone != user.phone:
            taken = User.query.filter(User.phone == new_phone, User.id != user.id).first()
            if taken:
                return err("Phone number already in use")
            user.phone = new_phone

    db.session.commit()
    return ok(user=user.to_dict())


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    """Change password. Verifies the current password before updating."""
    user = current_user()
    if not user:
        return err("User not found", 404)

    d = request.get_json() or {}
    current = d.get("current_password") or ""
    new_pw = d.get("new_password") or ""

    if not current or not new_pw:
        return err("Current and new password are required")

    if len(new_pw) < 8:
        return err("New password must be at least 8 characters")

    if not check_password(current, user.password_hash):
        return err("Current password is incorrect", 401)

    user.password_hash = hash_password(new_pw)
    db.session.commit()
    return ok(message="Password updated successfully")


# ────────────────────────────────────────────────────────────────────
# Password Reset Flow
# ────────────────────────────────────────────────────────────────────
#
# Two endpoints:
#   POST /api/auth/forgot-password  — user requests a reset link
#   POST /api/auth/reset-password   — user submits new password with token
#
# Security model:
#   - Always return success on forgot-password, even if email doesn't exist.
#     Prevents email enumeration ("does this email have an account?").
#   - Rate limit forgot-password requests by email + by IP to prevent
#     email-bombing (spammer triggers 1000 reset emails to one victim).
#   - Tokens stored as SHA-256 hashes — a DB leak doesn't yield live tokens.
#   - Tokens are one-shot and expire in 1 hour.

# In-memory rate limiter (per-process). For a single-worker Gunicorn this
# is fine. If we ever scale to multiple workers we'll move this to Redis.
_rate_limits = {}   # key -> [timestamp, count]


def _check_rate_limit(key: str, *, max_count: int, window_seconds: int) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    import time
    now = time.time()
    entry = _rate_limits.get(key)
    if entry is None or (now - entry[0]) > window_seconds:
        _rate_limits[key] = [now, 1]
        return True
    entry[1] += 1
    if entry[1] > max_count:
        return False
    return True


def _client_ip() -> str:
    """Get the real client IP, honoring X-Forwarded-For from nginx."""
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


@auth_bp.post("/forgot-password")
def forgot_password():
    """Issue a password reset token and email it to the user.

    Always returns success — even if the email doesn't match a real user
    — to prevent email enumeration.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email or not EMAIL_RE.match(email):
        return err("Please enter a valid email address", 400)

    # Rate limiting: per-email (max 3/hour) and per-IP (max 10/hour)
    if not _check_rate_limit(f"forgot_email:{email}", max_count=3, window_seconds=3600):
        return err("Too many reset requests for this email. Please wait an hour.", 429)
    ip = _client_ip()
    if not _check_rate_limit(f"forgot_ip:{ip}", max_count=10, window_seconds=3600):
        return err("Too many reset requests from your network. Please wait an hour.", 429)

    user = User.query.filter_by(email=email).first()

    # IMPORTANT: respond identically whether or not the user exists.
    # This prevents an attacker from probing "does this email have an account?"
    if user and user.is_active:
        from ..models.password_reset import PasswordResetToken
        from ..utils.email import send_password_reset_email
        import os
        raw_token = PasswordResetToken.issue_for_user(user.id, request_ip=ip)
        frontend_url = os.getenv("FRONTEND_URL", "https://cointap.online").rstrip("/")
        reset_url = f"{frontend_url}/reset-password?token={raw_token}"
        # Best-effort send — don't leak email failures to the response
        send_password_reset_email(
            to_email=user.email,
            full_name=user.full_name,
            reset_url=reset_url,
        )

    return ok(message="If an account with that email exists, a reset link has been sent.")


@auth_bp.get("/verify-reset-token")
def verify_reset_token():
    """Cheap pre-flight check: is this reset token still valid?

    Frontend hits this on /reset-password page load so users get an
    immediate "expired" error instead of typing a new password and
    only then being told the link is dead.

    Returns:
      { ok: true, valid: true }   — token is good, show the form
      { ok: true, valid: false }  — token is bad/used/expired
    """
    raw_token = (request.args.get("token") or "").strip()
    if not raw_token:
        return ok(valid=False, reason="missing")

    from ..models.password_reset import PasswordResetToken
    row = PasswordResetToken.find_valid_by_raw(raw_token)
    if not row:
        return ok(valid=False, reason="invalid_or_expired")

    return ok(valid=True)


@auth_bp.post("/reset-password")
def reset_password():
    """Consume a reset token and set a new password.

    Token is single-use and expires in 1 hour.
    """
    data = request.get_json(silent=True) or {}
    raw_token = (data.get("token") or "").strip()
    new_password = data.get("new_password") or ""

    if not raw_token:
        return err("Reset token is missing", 400)
    if not new_password or len(new_password) < 8:
        return err("Password must be at least 8 characters", 400)

    # Rate limit by IP to slow down brute-force on tokens. Tokens are 256
    # bits so brute-force is effectively impossible anyway, but this stops
    # someone hammering us with garbage.
    ip = _client_ip()
    if not _check_rate_limit(f"reset_ip:{ip}", max_count=20, window_seconds=600):
        return err("Too many attempts. Please wait a few minutes.", 429)

    from ..models.password_reset import PasswordResetToken
    row = PasswordResetToken.find_valid_by_raw(raw_token)
    if not row:
        return err("This reset link is invalid or has expired. Request a new one.", 400)

    user = User.query.get(row.user_id)
    if not user:
        return err("This reset link is invalid or has expired. Request a new one.", 400)

    # Update password and mark token used (transactionally)
    user.password_hash = hash_password(new_password)
    row.mark_used()
    db.session.commit()

    return ok(message="Password updated. You can now sign in with your new password.")
