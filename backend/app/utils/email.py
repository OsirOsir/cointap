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


def send_welcome_email(to_email: str, full_name: str, referral_code: str | None = None) -> bool:
    """Welcome email — sent once after registration (verification OFF mode)
    or after first successful verification (verification ON mode)."""
    import os
    first_name = full_name.split(" ")[0] if full_name else "there"
    frontend_url = os.getenv("FRONTEND_URL", "https://cointap.online").rstrip("/")
    dashboard_url = f"{frontend_url}/dashboard"
    plans_url = f"{frontend_url}/plans"
    ref_url = f"{frontend_url}/register?ref={referral_code}" if referral_code else None

    ref_section = ""
    if ref_url:
        ref_section = f"""
      <div style="margin:24px 0;padding:16px;background:#fef3e7;border-radius:12px;border-left:4px solid {_PRIMARY};">
        <div style="color:{_NAVY};font-size:13px;font-weight:bold;margin-bottom:6px;">🎁 Your referral code</div>
        <div style="font-family:monospace;font-size:18px;color:{_PRIMARY};font-weight:bold;letter-spacing:2px;">{referral_code}</div>
        <div style="font-size:12px;color:#666;margin-top:6px;">
          Share it with friends. You earn 3% of every friend's first investment, plus milestone bonuses.
        </div>
      </div>"""

    body_html = f"""
      <h2 style="margin:0 0 16px 0;color:{_NAVY};font-size:22px;">Welcome aboard, {first_name}! 🚀</h2>
      <p style="margin:0 0 16px 0;color:#333;font-size:15px;line-height:1.5;">
        Your CoinTap account is ready. Here's everything you need to get started.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;">
        <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
          <strong style="color:{_NAVY};">1. Deposit via M-Pesa</strong><br>
          <span style="color:#666;font-size:13px;">Add funds to your CoinTap wallet using your M-Pesa number.</span>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
          <strong style="color:{_NAVY};">2. Pick a plan</strong><br>
          <span style="color:#666;font-size:13px;">Choose an investment that matches your goals — durations from days to weeks.</span>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
          <strong style="color:{_NAVY};">3. Watch it grow</strong><br>
          <span style="color:#666;font-size:13px;">Your returns mature automatically. Withdraw to M-Pesa anytime after maturity.</span>
        </td></tr>
        <tr><td style="padding:12px 0;">
          <strong style="color:{_NAVY};">4. Earn from referrals</strong><br>
          <span style="color:#666;font-size:13px;">Share your code, earn bonuses when friends invest.</span>
        </td></tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
        <tr><td style="background:{_PRIMARY};border-radius:10px;">
          <a href="{dashboard_url}" style="display:inline-block;padding:14px 32px;color:#0a0e1a;font-weight:bold;text-decoration:none;font-size:15px;">
            Go to my dashboard →
          </a>
        </td></tr>
      </table>

      {ref_section}

      <p style="margin:24px 0 0 0;color:#888;font-size:13px;line-height:1.5;">
        Need help? Tap the chat bubble at the bottom-right of any CoinTap page — we usually reply within a few minutes.
      </p>
    """
    text_body = (
        f"Welcome to CoinTap, {first_name}!\n\n"
        f"Your account is ready. To get started:\n"
        f"  1. Deposit via M-Pesa\n"
        f"  2. Pick a plan\n"
        f"  3. Watch it grow — withdraw to M-Pesa after maturity\n"
        f"  4. Earn from referrals\n\n"
        f"Dashboard: {dashboard_url}\n"
        + (f"\nYour referral code: {referral_code}\n" if referral_code else "")
        + "\n— CoinTap"
    )
    html = _wrap_email(
        preheader="Welcome to CoinTap — here's how to get started.",
        body_html=body_html,
    )
    return send_email(
        to_email=to_email,
        subject="Welcome to CoinTap 🚀",
        html_body=html,
        text_body=text_body,
    )


def send_withdrawal_approved_email(
    to_email: str, full_name: str, amount: float, phone: str,
    reference: str | None = None,
) -> bool:
    """Sent when admin approves a withdrawal."""
    first_name = full_name.split(" ")[0] if full_name else "there"
    # Mask the phone number for the email body so it doesn't expose full number
    # Show first 4 + last 3: 0712XXX678
    masked_phone = phone
    if len(phone) >= 7:
        masked_phone = phone[:4] + "X" * (len(phone) - 7) + phone[-3:]

    body_html = f"""
      <h2 style="margin:0 0 16px 0;color:{_NAVY};font-size:22px;">Your withdrawal is on the way ✓</h2>
      <p style="margin:0 0 24px 0;color:#333;font-size:15px;line-height:1.5;">
        Hi {first_name}, we approved your withdrawal request. Funds are being sent now.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
        style="margin:20px 0;background:#fafafa;border-radius:12px;padding:0;">
        <tr><td style="padding:18px 20px;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Amount</div>
          <div style="font-size:28px;color:{_NAVY};font-weight:bold;font-family:monospace;">Ksh {amount:,.0f}</div>
        </td></tr>
        <tr><td style="padding:0 20px 12px 20px;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">M-Pesa Number</div>
          <div style="font-size:15px;color:{_NAVY};font-family:monospace;">{masked_phone}</div>
        </td></tr>
        {f'''<tr><td style="padding:0 20px 18px 20px;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Reference</div>
          <div style="font-size:13px;color:{_NAVY};font-family:monospace;">{reference}</div>
        </td></tr>''' if reference else ''}
      </table>

      <p style="margin:24px 0 0 0;color:#666;font-size:13px;line-height:1.5;">
        M-Pesa transfers usually arrive within a few minutes. If you don't see it within an hour, reach out via chat and we'll investigate.
      </p>
    """
    text_body = (
        f"Hi {first_name},\n\n"
        f"Your withdrawal of Ksh {amount:,.2f} was approved.\n"
        f"Sending to: {masked_phone}\n"
        + (f"Reference: {reference}\n" if reference else "")
        + f"\nFunds usually arrive within minutes.\n\n"
        f"— CoinTap"
    )
    html = _wrap_email(
        preheader=f"Withdrawal of Ksh {amount:,.0f} approved — on the way to your M-Pesa.",
        body_html=body_html,
    )
    return send_email(
        to_email=to_email,
        subject=f"Withdrawal approved — Ksh {amount:,.0f} on the way",
        html_body=html,
        text_body=text_body,
    )


def send_withdrawal_rejected_email(
    to_email: str, full_name: str, amount: float, reason: str | None = None,
) -> bool:
    """Sent when admin rejects a withdrawal. The amount is reversed to wallet."""
    first_name = full_name.split(" ")[0] if full_name else "there"
    reason_text = reason or "Please contact support if you'd like more details."

    body_html = f"""
      <h2 style="margin:0 0 16px 0;color:{_NAVY};font-size:22px;">Your withdrawal request was declined</h2>
      <p style="margin:0 0 16px 0;color:#333;font-size:15px;line-height:1.5;">
        Hi {first_name}, we weren't able to process your withdrawal of <strong>Ksh {amount:,.2f}</strong>.
      </p>
      <p style="margin:0 0 24px 0;color:#333;font-size:15px;line-height:1.5;">
        <strong>The full amount has been returned to your CoinTap wallet.</strong> Nothing was deducted.
      </p>

      <div style="margin:20px 0;padding:16px;background:#fef3e7;border-radius:12px;border-left:4px solid {_PRIMARY};">
        <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Reason</div>
        <div style="font-size:14px;color:{_NAVY};">{reason_text}</div>
      </div>

      <p style="margin:24px 0 0 0;color:#666;font-size:13px;line-height:1.5;">
        You can request a new withdrawal at any time from your wallet page. If you have questions about this decision, tap the chat bubble on CoinTap to reach support.
      </p>
    """
    text_body = (
        f"Hi {first_name},\n\n"
        f"Your withdrawal of Ksh {amount:,.2f} was declined.\n"
        f"Reason: {reason_text}\n\n"
        f"The full amount has been returned to your CoinTap wallet. "
        f"You can request a new withdrawal at any time.\n\n"
        f"— CoinTap"
    )
    html = _wrap_email(
        preheader=f"Withdrawal of Ksh {amount:,.0f} declined — refunded to your wallet.",
        body_html=body_html,
    )
    return send_email(
        to_email=to_email,
        subject="Your withdrawal request was declined",
        html_body=html,
        text_body=text_body,
    )
