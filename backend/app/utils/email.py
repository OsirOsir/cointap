"""
Email service — sends transactional emails via Brevo (SMTP).

Centralized so future features (welcome emails, withdrawal notifications,
careers application alerts, etc.) reuse the same configuration and the
same logging behaviour.

Configuration via env vars (set in backend/.env on the VPS):
  SMTP_HOST       — smtp-relay.brevo.com
  SMTP_PORT       — 587
  SMTP_USERNAME   — your Brevo login (e.g. a05a5b001@smtp-brevo.com)
  SMTP_PASSWORD   — your Brevo SMTP key (xsmtpsib-…)
  SMTP_FROM_EMAIL — noreply@cointap.online
  SMTP_FROM_NAME  — CoinTap
  FRONTEND_URL    — https://cointap.online (used in email links)

Failure modes:
  - If SMTP is misconfigured or unreachable, send_email() returns False
    and logs an error. Callers should treat email as best-effort; the
    *primary* user action (e.g. "request a password reset") should
    succeed regardless, with a generic "if your email exists, you'll
    get a link" UX message. This prevents email enumeration.
"""
import os
import smtplib
import ssl
import logging
from email.message import EmailMessage
from flask import current_app


log = logging.getLogger(__name__)


def _config() -> dict:
    """Read SMTP config from env. Returns a dict with all the bits."""
    return {
        "host": os.getenv("SMTP_HOST", "smtp-relay.brevo.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "username": os.getenv("SMTP_USERNAME", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "noreply@cointap.online"),
        "from_name": os.getenv("SMTP_FROM_NAME", "CoinTap"),
    }


def is_configured() -> bool:
    """True if we have enough config to attempt a send."""
    cfg = _config()
    return bool(cfg["username"] and cfg["password"])


def send_email(*, to_email: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
    """Send a transactional email. Returns True on success, False on failure.

    Never raises — we don't want a flaky SMTP server to break user flows.
    Callers should treat email as advisory.

    Args:
      to_email:   recipient (single address)
      subject:    email subject line
      html_body:  the HTML body
      text_body:  optional plain-text fallback. Auto-generated from HTML
                  if not provided (simple strip).
    """
    cfg = _config()
    if not is_configured():
        log.warning("[Email] SMTP not configured — skipping send to %s", to_email)
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f'{cfg["from_name"]} <{cfg["from_email"]}>'
    msg["To"] = to_email
    msg["Reply-To"] = cfg["from_email"]   # bounces go to noreply (and die there)

    # Plain text first (fallback), then HTML
    if not text_body:
        # Crude HTML-to-text: just strip tags. Good enough for fallback.
        import re
        text_body = re.sub(r"<[^>]+>", "", html_body)
        text_body = re.sub(r"\n\s*\n", "\n\n", text_body).strip()
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ctx)
            smtp.ehlo()
            smtp.login(cfg["username"], cfg["password"])
            smtp.send_message(msg)
        log.info("[Email] Sent '%s' to %s", subject, to_email)
        return True
    except smtplib.SMTPAuthenticationError as e:
        log.error("[Email] SMTP auth failed (check SMTP_USERNAME / SMTP_PASSWORD): %s", e)
        return False
    except (smtplib.SMTPException, ssl.SSLError, OSError) as e:
        log.error("[Email] Send failed to %s: %s", to_email, e)
        return False


# ────────────────────────────────────────────────────────────────────
# Templates
# ────────────────────────────────────────────────────────────────────

# Brand colours kept inline (most email clients don't load external CSS)
_PRIMARY = "#F7931A"
_NAVY = "#0A0E1A"
_GOLD = "#FFD700"


def _wrap_email(*, preheader: str, body_html: str) -> str:
    """Wrap a body in the standard CoinTap email shell.

    Uses table-based layout because every email client (Gmail, Outlook,
    Apple Mail) renders tables consistently — Flexbox and Grid don't
    work reliably in email.
    """
    return f"""<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CoinTap</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- Preheader text (shown in inbox preview, hidden in email body) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    {preheader}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,{_NAVY} 0%,#141821 100%);padding:32px 32px 24px 32px;text-align:center;">
          <div style="display:inline-block;vertical-align:middle;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width:40px;height:40px;background:linear-gradient(135deg,{_PRIMARY},#c2410c);border-radius:50%;text-align:center;vertical-align:middle;">
                <span style="color:{_GOLD};font-size:20px;font-weight:bold;line-height:40px;">1</span>
              </td>
              <td style="padding-left:12px;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px;">CoinTap</td>
            </tr></table>
          </div>
          <div style="color:rgba(255,255,255,0.6);font-size:11px;margin-top:8px;letter-spacing:1px;">DEPOSIT · INVEST · GROW · WITHDRAW</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          {body_html}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#fafafa;padding:20px 32px;border-top:1px solid #eee;text-align:center;color:#888;font-size:12px;">
          <div>You received this email because someone (hopefully you) requested it on cointap.online</div>
          <div style="margin-top:8px;">If this wasn't you, just ignore this message — no action will be taken.</div>
          <div style="margin-top:16px;color:#aaa;font-size:11px;">© 2026 CoinTap · Nairobi, Kenya</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def send_password_reset_email(to_email: str, full_name: str, reset_url: str) -> bool:
    """Send a "click this link to reset your password" email."""
    first_name = full_name.split(" ")[0] if full_name else "there"
    body_html = f"""
      <h2 style="margin:0 0 16px 0;color:{_NAVY};font-size:22px;">Reset your password</h2>
      <p style="margin:0 0 16px 0;color:#333;font-size:15px;line-height:1.5;">
        Hi {first_name},
      </p>
      <p style="margin:0 0 24px 0;color:#333;font-size:15px;line-height:1.5;">
        We got a request to reset the password on your CoinTap account. Click the button below
        to choose a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr><td style="background:{_PRIMARY};border-radius:10px;">
          <a href="{reset_url}" style="display:inline-block;padding:14px 32px;color:#0a0e1a;font-weight:bold;text-decoration:none;font-size:15px;">
            Reset my password →
          </a>
        </td></tr>
      </table>
      <p style="margin:24px 0 8px 0;color:#666;font-size:13px;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 24px 0;color:{_PRIMARY};font-size:12px;word-break:break-all;font-family:monospace;">
        {reset_url}
      </p>
      <p style="margin:24px 0 0 0;color:#888;font-size:13px;line-height:1.5;">
        <strong>Didn't request this?</strong> No worries — you can safely ignore this email.
        Your password won't change unless you click the link above and create a new one.
      </p>
    """
    text_body = (
        f"Hi {first_name},\n\n"
        f"We got a request to reset the password on your CoinTap account. Open the link below "
        f"to choose a new password. This link expires in 1 hour.\n\n"
        f"{reset_url}\n\n"
        f"Didn't request this? You can safely ignore this email.\n\n"
        f"— CoinTap"
    )
    html = _wrap_email(
        preheader="Reset your CoinTap password — link expires in 1 hour",
        body_html=body_html,
    )
    return send_email(
        to_email=to_email,
        subject="Reset your CoinTap password",
        html_body=html,
        text_body=text_body,
    )


def send_verification_email(to_email: str, full_name: str, verify_url: str) -> bool:
    """Send a "click this link to verify your email" email."""
    first_name = full_name.split(" ")[0] if full_name else "there"
    body_html = f"""
      <h2 style="margin:0 0 16px 0;color:{_NAVY};font-size:22px;">Welcome to CoinTap, {first_name}! 🎉</h2>
      <p style="margin:0 0 16px 0;color:#333;font-size:15px;line-height:1.5;">
        We're excited to have you on board. To finish setting up your account,
        please verify your email address by clicking the button below.
      </p>
      <p style="margin:0 0 24px 0;color:#333;font-size:15px;line-height:1.5;">
        This link expires in <strong>24 hours</strong>.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr><td style="background:{_PRIMARY};border-radius:10px;">
          <a href="{verify_url}" style="display:inline-block;padding:14px 32px;color:#0a0e1a;font-weight:bold;text-decoration:none;font-size:15px;">
            Verify my email →
          </a>
        </td></tr>
      </table>
      <p style="margin:24px 0 8px 0;color:#666;font-size:13px;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 24px 0;color:{_PRIMARY};font-size:12px;word-break:break-all;font-family:monospace;">
        {verify_url}
      </p>
      <p style="margin:24px 0 0 0;color:#888;font-size:13px;line-height:1.5;">
        <strong>Didn't sign up for CoinTap?</strong> Someone may have entered your email by mistake.
        You can safely ignore this email — no account will be activated without verification.
      </p>
    """
    text_body = (
        f"Welcome to CoinTap, {first_name}!\n\n"
        f"To finish setting up your account, please verify your email by opening the link below. "
        f"This link expires in 24 hours.\n\n"
        f"{verify_url}\n\n"
        f"Didn't sign up? Just ignore this email.\n\n"
        f"— CoinTap"
    )
    html = _wrap_email(
        preheader="Verify your CoinTap email address — one click to get started",
        body_html=body_html,
    )
    return send_email(
        to_email=to_email,
        subject="Verify your CoinTap email",
        html_body=html,
        text_body=text_body,
    )
