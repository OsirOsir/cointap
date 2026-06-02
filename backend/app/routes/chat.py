"""
Chat routes — public + authenticated.

Endpoints:
  POST /api/chat/start    — start or resume a conversation
  POST /api/chat/send     — send a message
  GET  /api/chat/messages — fetch messages (used for polling)
  POST /api/chat/read     — mark admin messages as read by user
  POST /api/chat/close    — user can close their own conversation
"""
from flask import Blueprint, request, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from datetime import datetime, timezone, timedelta
from ..extensions import db
from ..models.chat import Conversation, ChatMessage, generate_visitor_token
from ..models.user import User
from ..utils.helpers import ok, err

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")


# ──────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────

MAX_MESSAGE_LENGTH = 2000
MAX_OPEN_CONVS_PER_IP = 3          # anti-spam
RATE_LIMIT_WINDOW_SEC = 60
RATE_LIMIT_MAX_MESSAGES = 30


def _try_get_user():
    """Try to identify the logged-in user without requiring JWT. Returns User or None."""
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        if uid:
            return User.query.get(int(uid))
    except Exception:
        pass
    return None


def _client_ip() -> str:
    return (
        request.headers.get("X-Real-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
        or "unknown"
    )


def _user_agent() -> str:
    return (request.headers.get("User-Agent") or "")[:255]


def _resolve_conversation():
    """
    Identify which conversation this request belongs to.
    Returns (conversation, error_message). On success, error_message is None.

    For logged-in users → their conversation (only one open at a time).
    For anonymous → matched by visitor_token in the JSON body or X-Visitor-Token header.
    """
    user = _try_get_user()

    if user:
        # Find their open conversation
        conv = (
            Conversation.query
            .filter_by(user_id=user.id, status="open")
            .order_by(Conversation.last_message_at.desc())
            .first()
        )
        return conv, None  # may be None if they haven't started one yet

    # Anonymous — look for token
    d = request.get_json(silent=True) or {}
    token = d.get("visitor_token") or request.headers.get("X-Visitor-Token") or request.args.get("visitor_token")
    if not token:
        return None, None
    conv = Conversation.query.filter_by(visitor_token=token).first()
    if not conv:
        return None, "Invalid visitor token"
    return conv, None


def _rate_limited(conv: Conversation) -> bool:
    """True if this conversation has sent too many messages in the last minute."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=RATE_LIMIT_WINDOW_SEC)
    count = ChatMessage.query.filter(
        ChatMessage.conversation_id == conv.id,
        ChatMessage.sender == "user",
        ChatMessage.created_at >= cutoff,
    ).count()
    return count >= RATE_LIMIT_MAX_MESSAGES


# ──────────────────────────────────────────────────────────────────
# POST /start — Create or resume a conversation
# ──────────────────────────────────────────────────────────────────

@chat_bp.post("/start")
def start_conversation():
    user = _try_get_user()
    d = request.get_json(silent=True) or {}

    # ─── Logged-in user path ───
    if user:
        conv = Conversation.query.filter_by(user_id=user.id, status="open").first()
        if conv:
            return ok(conversation=conv.to_dict(), is_new=False)
        conv = Conversation(
            user_id=user.id,
            visitor_ip=_client_ip(),
            visitor_user_agent=_user_agent(),
        )
        db.session.add(conv)
        db.session.flush()
        _seed_welcome(conv)
        db.session.commit()
        return ok(conversation=conv.to_dict(include_messages=True), is_new=True)

    # ─── Anonymous path ───
    # If they pass a token, try to resume their existing conversation.
    token = d.get("visitor_token")
    if token:
        conv = Conversation.query.filter_by(visitor_token=token).first()
        if conv:
            return ok(conversation=conv.to_dict(include_messages=True), is_new=False)
        # Token unknown — fall through and create fresh

    # Anti-spam: cap open anonymous conversations per IP
    ip = _client_ip()
    open_count = Conversation.query.filter(
        Conversation.user_id.is_(None),
        Conversation.visitor_ip == ip,
        Conversation.status == "open",
    ).count()
    if open_count >= MAX_OPEN_CONVS_PER_IP:
        return err(
            f"Too many open chats from this device. Please continue an existing chat or wait.",
            429,
        )

    name = (d.get("name") or "").strip()[:120]
    email = (d.get("email") or "").strip().lower()[:120]

    new_token = generate_visitor_token()
    conv = Conversation(
        visitor_token=new_token,
        visitor_name=name or None,
        visitor_email=email or None,
        visitor_ip=ip,
        visitor_user_agent=_user_agent(),
    )
    db.session.add(conv)
    db.session.flush()
    _seed_welcome(conv)
    db.session.commit()
    return ok(
        conversation=conv.to_dict(include_messages=True),
        visitor_token=new_token,
        is_new=True,
    )


def _seed_welcome(conv: Conversation):
    """Add an initial system welcome message."""
    welcome = ChatMessage(
        conversation_id=conv.id,
        sender="system",
        body="👋 Welcome to CoinTap Support! Send us a message and we'll get back to you shortly.",
    )
    db.session.add(welcome)
    conv.last_message_at = datetime.now(timezone.utc)


# ──────────────────────────────────────────────────────────────────
# POST /send — Send a message
# ──────────────────────────────────────────────────────────────────

@chat_bp.post("/send")
def send_message():
    conv, e = _resolve_conversation()
    if e:
        return err(e, 401)
    if not conv:
        return err("No active conversation. Start a chat first.", 400)
    if conv.status != "open":
        return err("This conversation is closed.", 400)

    d = request.get_json() or {}
    body = (d.get("body") or "").strip()
    if not body:
        return err("Message cannot be empty")
    if len(body) > MAX_MESSAGE_LENGTH:
        return err(f"Message too long (max {MAX_MESSAGE_LENGTH} chars)")

    if _rate_limited(conv):
        return err("You're sending messages too fast. Please slow down.", 429)

    msg = ChatMessage(conversation_id=conv.id, sender="user", body=body)
    db.session.add(msg)
    conv.last_message_at = msg.created_at or datetime.now(timezone.utc)
    conv.unread_admin = (conv.unread_admin or 0) + 1
    db.session.commit()
    return ok(message=msg.to_dict())


# ──────────────────────────────────────────────────────────────────
# GET /messages — poll for new messages
# ──────────────────────────────────────────────────────────────────

@chat_bp.get("/messages")
def get_messages():
    conv, e = _resolve_conversation()
    if e:
        return err(e, 401)
    if not conv:
        return ok(conversation=None, messages=[])

    # Optional since=<isoformat> to only return newer messages
    since_str = request.args.get("since")
    q = ChatMessage.query.filter_by(conversation_id=conv.id)
    if since_str:
        try:
            since_dt = datetime.fromisoformat(since_str.replace("Z", "+00:00"))
            q = q.filter(ChatMessage.created_at > since_dt)
        except (ValueError, TypeError):
            pass
    msgs = q.order_by(ChatMessage.created_at.asc()).all()

    return ok(
        conversation=conv.to_dict(),
        messages=[m.to_dict() for m in msgs],
    )


# ──────────────────────────────────────────────────────────────────
# POST /read — mark admin messages as read
# ──────────────────────────────────────────────────────────────────

@chat_bp.post("/read")
def mark_read():
    conv, e = _resolve_conversation()
    if e:
        return err(e, 401)
    if not conv:
        return err("No conversation", 404)
    conv.unread_user = 0
    db.session.commit()
    return ok(ok=True)


# ──────────────────────────────────────────────────────────────────
# POST /close — user closes their own conversation
# ──────────────────────────────────────────────────────────────────

@chat_bp.post("/close")
def close_conversation():
    conv, e = _resolve_conversation()
    if e:
        return err(e, 401)
    if not conv:
        return err("No conversation", 404)
    conv.status = "closed"
    db.session.add(ChatMessage(
        conversation_id=conv.id,
        sender="system",
        body="The user closed this conversation.",
    ))
    db.session.commit()
    return ok(conversation=conv.to_dict())
