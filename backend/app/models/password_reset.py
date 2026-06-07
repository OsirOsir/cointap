"""
PasswordResetToken — one-shot tokens for the forgot-password flow.

How it works:
  1. User submits their email at /forgot-password
  2. If the email matches a real user, we generate a 64-char secure random
     token, store its SHA-256 hash (NOT the token itself) in this table,
     and email the raw token as part of the reset URL.
  3. User clicks the link → lands at /reset-password?token=...
  4. They submit a new password. We hash the incoming token and look it
     up. If found, unused, and not expired (1 hour), we let them set
     a new password and mark the token used.

Why we store the HASH not the token:
  Same reasoning as passwords. If the DB leaks, the attacker has hashes,
  not live tokens. Compromise scope is bounded.

Why one-shot:
  Tokens become invalid after first use. Prevents replay attacks.

Why 1 hour expiry:
  Short enough to limit theft window; long enough that users can read
  their email and click without panicking.
"""
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from ..extensions import db


TOKEN_TTL_HOURS = 1


def hash_token(raw_token: str) -> str:
    """Hash a raw token using SHA-256 (NOT bcrypt — these are short-lived
    high-entropy strings, not passwords). Returns the hex digest."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_raw_token() -> str:
    """64 hex chars = 256 bits of entropy. URL-safe, no padding."""
    return secrets.token_hex(32)


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    request_ip = db.Column(db.String(45), nullable=True)   # supports IPv6

    def is_valid(self) -> bool:
        if self.used_at is not None:
            return False
        # SQLAlchemy stores tz-aware UTC; compare against tz-aware now
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return now < expires

    def mark_used(self):
        self.used_at = datetime.now(timezone.utc)

    @staticmethod
    def issue_for_user(user_id: int, request_ip: str | None = None) -> str:
        """Create and store a new reset token for the given user. Returns
        the raw token (only thing the user/email needs)."""
        raw = generate_raw_token()
        row = PasswordResetToken(
            user_id=user_id,
            token_hash=hash_token(raw),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
            request_ip=request_ip,
        )
        db.session.add(row)
        db.session.commit()
        return raw

    @staticmethod
    def find_valid_by_raw(raw_token: str):
        """Look up a token by its raw value. Returns the row only if it
        exists, is unused, and not expired."""
        row = PasswordResetToken.query.filter_by(token_hash=hash_token(raw_token)).first()
        if not row:
            return None
        if not row.is_valid():
            return None
        return row
