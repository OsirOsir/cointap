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

