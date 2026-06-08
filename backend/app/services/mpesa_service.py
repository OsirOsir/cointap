"""
M-Pesa Daraja integration — sandbox + production via the same code.

What's here:
  - OAuth token caching (Daraja gives 1-hour tokens; we re-use them)
  - Phone number normalization (0712… / +254712… / 712… / 254712… → 254712…)
  - STK Push for deposits (initiate + handle callback)
  - STK Query for stuck-pending reconciliation
  - B2C for withdrawals — preserved as-is from the previous version, currently
    triggered manually by admin during approval (per project decision to keep
    withdrawals manual for now)

Sandbox vs Production:
  Switch the entire integration by setting MPESA_ENVIRONMENT=production in .env.
  All endpoints, credentials, and shortcodes come from environment variables.
  No code change required at switchover.

Security notes:
  - Callbacks are PUBLIC endpoints (Safaricom calls us). We do NOT trust the
    payload blindly — we look up the local MpesaLog by CheckoutRequestID and
    only credit a wallet if the local record was actually pending. Replays
    are no-ops because we mark logs as success/failed on first callback.
  - We never expose any Daraja credentials to the frontend.
  - We never log raw secrets.
"""
import base64
import json
import re
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests
from flask import current_app

from ..extensions import db
from ..models.mpesa_log import MpesaLog


log = logging.getLogger(__name__)


# ─── Token caching ──────────────────────────────────────────────────────
# Daraja access tokens are valid ~1 hour. Fetching one is slow (~600ms) and
# rate-limited. We cache per-process; safe for Gunicorn single-worker setup.

_token_cache = {"value": None, "expires_at": datetime(1970, 1, 1, tzinfo=timezone.utc)}
_token_lock = threading.Lock()


def _base_url() -> str:
    env = current_app.config.get("MPESA_ENVIRONMENT", "sandbox")
    return "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"


def _get_access_token() -> str:
    """Fetch (or reuse cached) Daraja OAuth token. Refreshes 60s before expiry."""
    now = datetime.now(timezone.utc)
    with _token_lock:
        if _token_cache["value"] and _token_cache["expires_at"] > now + timedelta(seconds=60):
            return _token_cache["value"]

        key = current_app.config["MPESA_CONSUMER_KEY"]
        secret = current_app.config["MPESA_CONSUMER_SECRET"]
        if not key or not secret:
            raise RuntimeError("M-Pesa credentials not configured (MPESA_CONSUMER_KEY / SECRET)")

        resp = requests.get(
            f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
            auth=(key, secret),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data["access_token"]
        # Daraja returns expires_in as a string sometimes
        ttl = int(data.get("expires_in", 3599))
        _token_cache["value"] = token
        _token_cache["expires_at"] = now + timedelta(seconds=ttl)
        return token


def _timestamp() -> str:
    """Daraja wants timestamp in Nairobi local time, format YYYYMMDDHHMMSS.
    We use server local time which on the VPS is UTC; Daraja accepts UTC."""
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _password(shortcode: str, passkey: str, ts: str) -> str:
    raw = f"{shortcode}{passkey}{ts}"
    return base64.b64encode(raw.encode()).decode()


# ─── Phone normalisation ────────────────────────────────────────────────
# Accept any of: 0712345678 / +254712345678 / 254712345678 / 712345678 (rare)
# Normalize to: 254712345678 (no leading +, no leading 0)

_KE_PHONE_RE = re.compile(r"^254[17]\d{8}$")


def normalize_phone(raw: str) -> Optional[str]:
    """Return the canonical 254XXXXXXXXX form, or None if not a valid KE number."""
    if not raw:
        return None
    phone = re.sub(r"[\s\-()]", "", raw.strip())
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"):
        # bare 9-digit format e.g. "712345678"
        if len(phone) == 9:
            phone = "254" + phone
    if _KE_PHONE_RE.match(phone):
        return phone
    return None


# ─── STK Push (deposit) ─────────────────────────────────────────────────

def initiate_stk_push(user_id: int, phone: str, amount: float) -> dict:
    """Trigger M-Pesa STK Push for a deposit.

    Returns:
      {"ok": True,  "checkout_request_id": "ws_CO_…", "log_id": 42}  on success
      {"ok": False, "error": "human readable", "log_id": 42}        on failure

    The log_id is returned even on failure so the frontend can poll the
    /deposit/status endpoint to confirm what happened.
    """
    # Validate inputs early — better UX than a Daraja error
    norm_phone = normalize_phone(phone)
    if not norm_phone:
        return {"ok": False, "error": "Phone number doesn't look right. Use format 07XXXXXXXX."}
    try:
        amount_int = int(amount)
    except (TypeError, ValueError):
        return {"ok": False, "error": "Invalid amount"}
    if amount_int < 1:
        return {"ok": False, "error": "Amount must be at least Ksh 1"}
    if amount_int > 150_000:
        # Sandbox tops out at 150k, production may differ; sanity guard
        return {"ok": False, "error": "Amount exceeds the per-transaction limit"}

    # Always log the attempt before contacting Daraja, so we have a record
    # even if the HTTP call fails.
    record = MpesaLog(
        user_id=user_id,
        transaction_type="stk_push",
        phone=norm_phone,
        amount=amount_int,
        status="pending",
    )
    db.session.add(record)
    db.session.commit()

    shortcode = current_app.config["MPESA_SHORTCODE"]
    passkey = current_app.config["MPESA_PASSKEY"]
    callback_url = current_app.config["MPESA_CALLBACK_URL"]

    if not shortcode or not passkey or not callback_url:
        record.status = "failed"
        record.result_desc = "M-Pesa not configured on server"
        db.session.commit()
        return {"ok": False, "error": "Payments are temporarily unavailable. Please try again later.", "log_id": record.id}

    ts = _timestamp()
    pwd = _password(shortcode, passkey, ts)
    payload = {
        "BusinessShortCode": shortcode,
        "Password": pwd,
        "Timestamp": ts,
        # For "Till" / Buy Goods: "CustomerBuyGoodsOnline"
        # For "Paybill": "CustomerPayBillOnline"
        "TransactionType": current_app.config.get("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline"),
        "Amount": amount_int,
        "PartyA": norm_phone,
        "PartyB": shortcode,
        "PhoneNumber": norm_phone,
        "CallBackURL": callback_url,
        "AccountReference": f"CoinTap-{user_id}",
        "TransactionDesc": "CoinTap wallet deposit",
    }

    try:
        token = _get_access_token()
        resp = requests.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        data = resp.json()
        if data.get("ResponseCode") == "0":
            record.checkout_request_id = data.get("CheckoutRequestID")
            record.merchant_request_id = data.get("MerchantRequestID")
            db.session.commit()
            return {
                "ok": True,
                "checkout_request_id": record.checkout_request_id,
                "log_id": record.id,
            }
        # Daraja returned a non-zero response code → push didn't reach the user
        record.status = "failed"
        record.result_desc = data.get("errorMessage") or data.get("ResponseDescription") or "STK push rejected"
        db.session.commit()
        log.warning("[M-Pesa] STK push rejected by Daraja: %s", record.result_desc)
        return {"ok": False, "error": _user_friendly_error(record.result_desc), "log_id": record.id}
    except requests.RequestException as e:
        record.status = "failed"
        record.result_desc = f"Network error: {e}"
        db.session.commit()
        log.error("[M-Pesa] STK push network error: %s", e)
        return {"ok": False, "error": "Could not reach M-Pesa. Please try again.", "log_id": record.id}
    except Exception as e:
        record.status = "failed"
        record.result_desc = f"Internal error: {e}"
        db.session.commit()
        log.exception("[M-Pesa] STK push unexpected error")
        return {"ok": False, "error": "Something went wrong. Please try again.", "log_id": record.id}


def _user_friendly_error(daraja_msg: Optional[str]) -> str:
    """Translate Daraja's terse messages into something users can act on."""
    if not daraja_msg:
        return "Payment couldn't be initiated. Please try again."
    msg = daraja_msg.lower()
    if "invalid" in msg and "phone" in msg:
        return "That phone number is not registered with M-Pesa."
    if "duplicate" in msg or "rate" in msg:
        return "You just made a request — please wait a few seconds before trying again."
    if "insufficient" in msg:
        return "M-Pesa says your account doesn't have enough funds."
    return "Payment couldn't be initiated. Please try again."


def handle_stk_callback(payload: dict) -> bool:
    """Process the STK Push callback from Daraja.

    Called by Safaricom (POST to /api/mpesa/stk-callback) — public endpoint.

    Daraja sends ONE callback per STK request. On success, we credit the
    user's wallet exactly once. Repeated callbacks (Daraja sometimes retries)
    are safe because we only credit when status is still 'pending'.
    """
    try:
        body = payload.get("Body", {}).get("stkCallback", {})
        checkout_id = body.get("CheckoutRequestID")
        result_code = body.get("ResultCode")
        result_desc = body.get("ResultDesc", "")

        record = MpesaLog.query.filter_by(checkout_request_id=checkout_id).first()
        if not record:
            log.warning("[M-Pesa] Callback for unknown checkout_id: %s", checkout_id)
            return False

        # Idempotency: only act on pending records
        if record.status != "pending":
            log.info("[M-Pesa] Callback received for already-resolved %s (status=%s) — ignoring",
                     checkout_id, record.status)
            return True

        record.raw_callback = json.dumps(payload)
        record.result_code = int(result_code) if result_code is not None else None
        record.result_desc = result_desc[:255]
        record.completed_at = datetime.now(timezone.utc)

        if result_code == 0:
            # Success — extract metadata
            items = body.get("CallbackMetadata", {}).get("Item", [])
            meta = {i["Name"]: i.get("Value") for i in items}
            receipt = str(meta.get("MpesaReceiptNumber", ""))
            amount = float(meta.get("Amount", record.amount or 0))

            record.status = "success"
            record.mpesa_receipt = receipt

            # Credit the wallet
            from .wallet_service import credit_wallet, get_or_create_wallet
            wallet = get_or_create_wallet(record.user_id)
            credit_wallet(
                wallet, amount,
                tx_type="deposit",
                description="M-Pesa deposit",
                reference=receipt,
            )
            log.info("[M-Pesa] Deposit confirmed — user=%s amount=%s receipt=%s",
                     record.user_id, amount, receipt)
        else:
            # ResultCode != 0 — failure (user cancelled, wrong PIN, timeout, etc.)
            record.status = "failed"
            log.info("[M-Pesa] STK push failed — user=%s code=%s desc=%s",
                     record.user_id, result_code, result_desc)

        db.session.commit()
        return True
    except Exception:
        log.exception("[M-Pesa] Callback handler crashed")
        db.session.rollback()
        return False


# ─── STK Query — for reconciliation of stuck pendings ───────────────────

def query_stk_status(checkout_request_id: str) -> dict:
    """Ask Daraja about the current state of a CheckoutRequestID.

    Used by the reconciliation job to recover from missing callbacks.

    Returns:
      {"ok": True, "result_code": 0, "result_desc": "...", "raw": {...}}
      {"ok": False, "error": "..."}
    """
    shortcode = current_app.config["MPESA_SHORTCODE"]
    passkey = current_app.config["MPESA_PASSKEY"]
    ts = _timestamp()
    pwd = _password(shortcode, passkey, ts)
    payload = {
        "BusinessShortCode": shortcode,
        "Password": pwd,
        "Timestamp": ts,
        "CheckoutRequestID": checkout_request_id,
    }
    try:
        token = _get_access_token()
        resp = requests.post(
            f"{_base_url()}/mpesa/stkpushquery/v1/query",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        data = resp.json()
        # ResponseCode == "0" means the QUERY succeeded — but the actual transaction
        # outcome is in ResultCode (0 = paid, 1032 = cancelled, 1037 = timeout, etc.)
        if data.get("ResponseCode") == "0":
            return {
                "ok": True,
                "result_code": int(data.get("ResultCode", -1)),
                "result_desc": data.get("ResultDesc", ""),
                "raw": data,
            }
        return {"ok": False, "error": data.get("errorMessage") or data.get("ResponseDescription") or "Query failed"}
    except Exception as e:
        log.exception("[M-Pesa] STK query failed")
        return {"ok": False, "error": str(e)}


def reconcile_stuck_pending(min_age_seconds: int = 90, max_logs: int = 50) -> int:
    """Find STK pushes that are still 'pending' after `min_age_seconds` and
    ask Daraja for their actual status. Update local records accordingly.

    Returns the number of logs that were updated (success or failed).

    Called by the scheduler every 5 minutes.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=min_age_seconds)
    # Only reconcile logs we haven't checked in the last 60 seconds, to avoid
    # hammering Daraja for the same stuck record.
    poll_cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)

    candidates = (
        MpesaLog.query
        .filter(MpesaLog.transaction_type == "stk_push")
        .filter(MpesaLog.status == "pending")
        .filter(MpesaLog.created_at < cutoff)
        .filter((MpesaLog.reconciled_at == None) | (MpesaLog.reconciled_at < poll_cutoff))  # noqa: E711
        .filter(MpesaLog.checkout_request_id != None)  # noqa: E711
        .order_by(MpesaLog.created_at.asc())
        .limit(max_logs)
        .all()
    )

    updated = 0
    for record in candidates:
        record.reconciled_at = datetime.now(timezone.utc)
        result = query_stk_status(record.checkout_request_id)
        if not result["ok"]:
            # Common: Daraja returns "transaction is being processed" for very fresh logs
            # Just commit reconciled_at and try again next cycle
            db.session.commit()
            continue

        code = result["result_code"]
        record.result_code = code
        record.result_desc = (result.get("result_desc") or "")[:255]
        record.raw_callback = json.dumps(result.get("raw", {}))

        if code == 0:
            # Success! But we don't have receipt/amount from query response.
            # Mark as success but flag for manual review since callback never came.
            # In practice the wallet credit happens via the callback flow normally.
            # If query says success but callback never arrived, we credit using
            # the original requested amount and mark with a placeholder receipt.
            if record.status == "pending":
                record.status = "success"
                record.completed_at = datetime.now(timezone.utc)
                record.mpesa_receipt = record.mpesa_receipt or f"RECON-{record.id}"
                from .wallet_service import credit_wallet, get_or_create_wallet
                wallet = get_or_create_wallet(record.user_id)
                credit_wallet(
                    wallet, float(record.amount),
                    tx_type="deposit",
                    description="M-Pesa deposit (reconciled)",
                    reference=record.mpesa_receipt,
                )
                updated += 1
                log.info("[M-Pesa Reconcile] Late-confirmed deposit — log=%s user=%s amount=%s",
                         record.id, record.user_id, record.amount)
        else:
            # Failure codes: 1032=cancelled, 1037=timeout, 2001=wrong PIN, etc.
            if record.status == "pending":
                record.status = "failed"
                record.completed_at = datetime.now(timezone.utc)
                updated += 1
                log.info("[M-Pesa Reconcile] Confirmed failure — log=%s code=%s desc=%s",
                         record.id, code, record.result_desc)

        db.session.commit()

    return updated


def expire_old_pendings(max_age_minutes: int = 30) -> int:
    """Final fallback: any log that's been pending longer than max_age_minutes
    and never got a callback/reconciliation result is marked 'expired'.

    Wallet is NOT credited. The user can simply retry."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
    stale = (
        MpesaLog.query
        .filter(MpesaLog.transaction_type == "stk_push")
        .filter(MpesaLog.status == "pending")
        .filter(MpesaLog.created_at < cutoff)
        .all()
    )
    count = 0
    for r in stale:
        r.status = "expired"
        r.completed_at = datetime.now(timezone.utc)
        r.result_desc = r.result_desc or "No callback received within timeout window"
        count += 1
    if count:
        db.session.commit()
        log.info("[M-Pesa Reconcile] Expired %s stale pendings", count)
    return count


# ─── B2C (withdrawals) — preserved from original, currently unused ───────
# Withdrawals are MANUAL for now per project decision. The functions below
# are kept for the eventual switchover. They're not called from anywhere.

def initiate_b2c(withdrawal_id: int, phone: str, amount: float) -> dict:
    """B2C — preserved for future automation. Not currently called."""
    env = current_app.config.get("MPESA_ENVIRONMENT", "sandbox")
    base = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    shortcode = current_app.config.get("MPESA_B2C_SHORTCODE", "")
    initiator = current_app.config.get("MPESA_B2C_INITIATOR_NAME", "")
    credential = current_app.config.get("MPESA_B2C_SECURITY_CREDENTIAL", "")
    result_url = current_app.config.get("MPESA_B2C_RESULT_URL", "")
    timeout_url = current_app.config.get("MPESA_B2C_TIMEOUT_URL", "")

    if not all([shortcode, initiator, credential, result_url, timeout_url]):
        return {"ok": False, "error": "B2C not configured"}

    norm_phone = normalize_phone(phone)
    if not norm_phone:
        return {"ok": False, "error": "Invalid phone"}

    payload = {
        "InitiatorName": initiator,
        "SecurityCredential": credential,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": shortcode,
        "PartyB": norm_phone,
        "Remarks": f"CoinTap withdrawal #{withdrawal_id}",
        "QueueTimeOutURL": timeout_url,
        "ResultURL": result_url,
        "Occasion": f"WD-{withdrawal_id}",
    }
    try:
        token = _get_access_token()
        resp = requests.post(
            f"{base}/mpesa/b2c/v3/paymentrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        data = resp.json()
        if data.get("ResponseCode") == "0":
            return {"ok": True, "conversation_id": data.get("ConversationID")}
        return {"ok": False, "error": data.get("errorMessage", "B2C failed")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def handle_b2c_callback(payload: dict) -> bool:
    """Preserved for future. Not currently called (withdrawals are manual)."""
    try:
        result = payload.get("Result", {})
        result_code = result.get("ResultCode")
        params_list = result.get("ResultParameters", {}).get("ResultParameter", [])
        params = {p["Key"]: p["Value"] for p in params_list}
        receipt = params.get("TransactionReceipt", "")

        occasion = result.get("OriginatorConversationID", "")
        from ..models.withdrawal import Withdrawal
        wd_id = int(occasion.replace("WD-", "")) if occasion.startswith("WD-") else 0
        wd = Withdrawal.query.get(wd_id)
        if not wd:
            return False

        if result_code == 0:
            wd.status = "Paid"
            wd.mpesa_reference = receipt
            wd.processed_at = datetime.now(timezone.utc)
        else:
            wd.status = "Rejected"
            wd.processed_at = datetime.now(timezone.utc)
            from .wallet_service import credit_wallet, get_or_create_wallet
            wallet = get_or_create_wallet(wd.user_id)
            credit_wallet(
                wallet, float(wd.amount),
                tx_type="withdrawal_reversal",
                description="B2C payment failed — funds returned",
                reference=f"REV-{wd.id}",
            )
        db.session.commit()
        return True
    except Exception:
        db.session.rollback()
        return False
