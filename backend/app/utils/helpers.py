from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from ..models.user import User


def admin_required(fn):
    """Decorator: require admin role on JWT-protected routes."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def current_user() -> User | None:
    user_id = get_jwt_identity()
    return User.query.get(int(user_id)) if user_id else None


def ok(data: dict = None, **kwargs):
    return jsonify({"ok": True, **(data or {}), **kwargs})


def err(message: str, status: int = 400):
    return jsonify({"ok": False, "error": message}), status
