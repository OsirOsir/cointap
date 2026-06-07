"""
EmailVerificationToken — one-shot tokens for the email verification flow.

Pattern mirrors PasswordResetToken — same security model, same lifecycle.
Differences:
  - 24-hour expiry (vs 1 hour for password reset) — verification is a
    one-time onboarding step, no need to rush the user
  - Tokens are tied to a specific email at the time of issuance, so even
    if the user changes email later, an old token verifies the old email

Storage: SHA-256 hash, not the raw token. DB leak ≠ live tokens.
"""
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from ..extensions import db


TOKEN_TTL_HOURS = 24


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_raw_token() -> str:
    return secrets.token_hex(32)


class EmailVerificationToken(db.Model):
    __tablename__ = "email_verification_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    # Email at time of issuance — defends against "change email then verify
    # old token" sneaky paths
    email = db.Column(db.String(120), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    request_ip = db.Column(db.String(45), nullable=True)

    def is_valid(self) -> bool:
        if self.used_at is not None:
            return False
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return now < expires

    def mark_used(self):
        self.used_at = datetime.now(timezone.utc)

    @staticmethod
    def issue_for_user(user, request_ip: str | None = None) -> str:
        """Create and store a new verification token. Returns the raw
        token (only the email needs it). Optionally invalidates older
        unused tokens for the same user to avoid token sprawl."""
        # Mark any prior unused tokens for this user as superseded (used)
        # so they can't be reused later.
        EmailVerificationToken.query.filter_by(user_id=user.id, used_at=None).update(
            {"used_at": datetime.now(timezone.utc)}
        )
        raw = generate_raw_token()
        row = EmailVerificationToken(
            user_id=user.id,
            email=user.email,
            token_hash=hash_token(raw),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
            request_ip=request_ip,
        )
        db.session.add(row)
        db.session.commit()
        return raw

    @staticmethod
    def find_valid_by_raw(raw_token: str):
        row = EmailVerificationToken.query.filter_by(token_hash=hash_token(raw_token)).first()
        if not row:
            return None
        if not row.is_valid():
            return None
        return row
