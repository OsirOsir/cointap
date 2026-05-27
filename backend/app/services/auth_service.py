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
