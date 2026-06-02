"""
Chat models — live support chat for both logged-in users and anonymous visitors.

A conversation is the top-level thread. It belongs to:
- a User (if user_id is set), OR
- an anonymous visitor (identified by visitor_token)

Messages are append-only and stored forever (decided by spec).
"""
from ..extensions import db
from datetime import datetime, timezone
import secrets


def _utc_now():
    return datetime.now(timezone.utc)


def generate_visitor_token() -> str:
    """64-char URL-safe token for anonymous visitors to prove ownership."""
    return secrets.token_urlsafe(48)   # produces ~64 chars


class Conversation(db.Model):
    __tablename__ = "chat_conversations"

    id = db.Column(db.Integer, primary_key=True)

    # ONE of these will be set:
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    visitor_token = db.Column(db.String(80), nullable=True, unique=True, index=True)

    # Captured if anonymous visitor types their info in the pre-chat form
    visitor_name = db.Column(db.String(120), nullable=True)
    visitor_email = db.Column(db.String(120), nullable=True)
    visitor_ip = db.Column(db.String(64), nullable=True)        # for rate-limit / abuse
    visitor_user_agent = db.Column(db.String(255), nullable=True)

    # 'open' (active) | 'closed' (admin marked done)
    status = db.Column(db.String(16), default="open", index=True, nullable=False)

    # Unread counters — cheap to query, eventually-consistent
    unread_user = db.Column(db.Integer, default=0, nullable=False)
    unread_admin = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime, default=_utc_now, nullable=False)
    last_message_at = db.Column(db.DateTime, default=_utc_now, index=True, nullable=False)

    # Relationships
    user = db.relationship("User", foreign_keys=[user_id])
    messages = db.relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at.asc()",
    )

    def display_name(self) -> str:
        """Best label for this conversation, for admin UI."""
        if self.user:
            return self.user.full_name
        if self.visitor_name:
            return f"{self.visitor_name} (guest)"
        return f"Guest #{self.id}"

    def display_contact(self) -> str:
        """Best contact line."""
        if self.user:
            return self.user.email
        return self.visitor_email or "anonymous"

    def to_dict(self, include_messages: bool = False):
        d = {
            "id": self.id,
            "user_id": self.user_id,
            "is_guest": self.user_id is None,
            "visitor_name": self.visitor_name,
            "visitor_email": self.visitor_email,
            "display_name": self.display_name(),
            "display_contact": self.display_contact(),
            "status": self.status,
            "unread_user": int(self.unread_user or 0),
            "unread_admin": int(self.unread_admin or 0),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
        }
        if include_messages:
            d["messages"] = [m.to_dict() for m in self.messages]
        return d


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer,
        db.ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 'user'   = sent by the visitor/logged-in user
    # 'admin'  = sent by an admin
    # 'system' = auto-generated (welcome message, off-hours notice, etc.)
    sender = db.Column(db.String(16), nullable=False)

    body = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=_utc_now, index=True, nullable=False)

    conversation = db.relationship("Conversation", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender": self.sender,
            "body": self.body,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
