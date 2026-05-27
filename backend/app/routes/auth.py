from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
)
from ..services.auth_service import register_user, authenticate_user
from ..models.user import User
from ..utils.helpers import current_user, err, ok

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
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
        access_token=create_access_token(identity=user.id),
        refresh_token=create_refresh_token(identity=user.id),
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
        access_token=create_access_token(identity=user.id),
        refresh_token=create_refresh_token(identity=user.id),
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    return ok(access_token=create_access_token(identity=user_id))


@auth_bp.get("/me")
@jwt_required()
def me():
    user = current_user()
    if not user:
        return err("User not found", 404)
    return ok(user=user.to_dict())


@auth_bp.put("/me")
@jwt_required()
def update_me():
    user = current_user()
    if not user:
        return err("User not found", 404)
    d = request.get_json() or {}
    if d.get("full_name"):
        user.full_name = d["full_name"].strip()
    if d.get("phone"):
        user.phone = d["phone"].strip()
    if d.get("password"):
        from ..services.auth_service import hash_password
        user.password_hash = hash_password(d["password"])
    from ..extensions import db
    db.session.commit()
    return ok(user=user.to_dict())
