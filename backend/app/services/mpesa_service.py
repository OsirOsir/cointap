import base64
import json
import requests
from datetime import datetime, timezone
from flask import current_app
from ..extensions import db
from ..models.mpesa_log import MpesaLog


def _get_access_token() -> str:
    env = current_app.config["MPESA_ENVIRONMENT"]
    base = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    resp = requests.get(
        f"{base}/oauth/v1/generate?grant_type=client_credentials",
        auth=(
            current_app.config["MPESA_CONSUMER_KEY"],
            current_app.config["MPESA_CONSUMER_SECRET"],
        ),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _password(shortcode: str, passkey: str, ts: str) -> str:
    raw = f"{shortcode}{passkey}{ts}"
    return base64.b64encode(raw.encode()).decode()


def initiate_stk_push(user_id: int, phone: str, amount: float) -> dict:
    """
    Trigger M-Pesa STK Push for a deposit.
    Returns {"ok": True, "checkout_request_id": ...} or {"ok": False, "error": ...}
    """
    env = current_app.config["MPESA_ENVIRONMENT"]
    base = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    shortcode = current_app.config["MPESA_SHORTCODE"]
    passkey = current_app.config["MPESA_PASSKEY"]
    callback_url = current_app.config["MPESA_CALLBACK_URL"]

    ts = _timestamp()
    pwd = _password(shortcode, passkey, ts)

    # Normalise phone: 0712345678 → 254712345678
    phone = phone.strip().replace(" ", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("+"):
        phone = phone[1:]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": pwd,
        "Timestamp": ts,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": "CoinTap",
        "TransactionDesc": "Wallet Deposit",
    }

    log = MpesaLog(
        user_id=user_id,
        transaction_type="stk_push",
        phone=phone,
        amount=amount,
        status="pending",
    )
    db.session.add(log)

    try:
        token = _get_access_token()
        resp = requests.post(
            f"{base}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        data = resp.json()
        if data.get("ResponseCode") == "0":
            log.checkout_request_id = data.get("CheckoutRequestID")
            db.session.commit()
            return {"ok": True, "checkout_request_id": log.checkout_request_id}
        else:
            log.status = "failed"
            db.session.commit()
            return {"ok": False, "error": data.get("errorMessage", "STK Push failed")}
    except Exception as e:
        log.status = "failed"
        db.session.commit()
        return {"ok": False, "error": str(e)}


def handle_stk_callback(payload: dict) -> bool:
    """
    Process the STK Push callback from Daraja.
    Credits the user wallet on success.
    """
    try:
        body = payload.get("Body", {}).get("stkCallback", {})
        checkout_id = body.get("CheckoutRequestID")
        result_code = body.get("ResultCode")

        log = MpesaLog.query.filter_by(checkout_request_id=checkout_id).first()
        if not log:
            return False

        log.raw_callback = json.dumps(payload)

        if result_code == 0:
            # Extract metadata
            items = body.get("CallbackMetadata", {}).get("Item", [])
            meta = {i["Name"]: i.get("Value") for i in items}
            receipt = meta.get("MpesaReceiptNumber", "")
            amount = float(meta.get("Amount", 0))

            log.status = "success"
            log.mpesa_receipt = receipt

            # Credit wallet
            from .wallet_service import credit_wallet, get_or_create_wallet
            wallet = get_or_create_wallet(log.user_id)
            credit_wallet(
                wallet, amount,
                tx_type="deposit",
                description="M-Pesa deposit",
                reference=receipt,
            )
        else:
            log.status = "failed"

        db.session.commit()
        return True
    except Exception:
        db.session.rollback()
        return False


def initiate_b2c(withdrawal_id: int, phone: str, amount: float) -> dict:
    """
    Send B2C payment for an approved withdrawal.
    """
    env = current_app.config["MPESA_ENVIRONMENT"]
    base = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    shortcode = current_app.config["MPESA_B2C_SHORTCODE"]
    initiator = current_app.config["MPESA_B2C_INITIATOR_NAME"]
    credential = current_app.config["MPESA_B2C_SECURITY_CREDENTIAL"]
    result_url = current_app.config["MPESA_B2C_RESULT_URL"]
    timeout_url = current_app.config["MPESA_B2C_TIMEOUT_URL"]

    phone = phone.strip().replace(" ", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("+"):
        phone = phone[1:]

    payload = {
        "InitiatorName": initiator,
        "SecurityCredential": credential,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": shortcode,
        "PartyB": phone,
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
    """Process B2C result and mark withdrawal as Paid."""
    try:
        result = payload.get("Result", {})
        result_code = result.get("ResultCode")
        params = {p["Key"]: p["Value"] for p in result.get("ResultParameters", {}).get("ResultParameter", [])}
        receipt = params.get("TransactionReceipt", "")

        # Find the withdrawal by Occasion
        occasion = result.get("OriginatorConversationID", "")
        from ..models.withdrawal import Withdrawal
        wd_id = int(occasion.replace("WD-", "")) if occasion.startswith("WD-") else 0
        wd = Withdrawal.query.get(wd_id)
        if not wd:
            return False

        from datetime import datetime, timezone
        if result_code == 0:
            wd.status = "Paid"
            wd.mpesa_reference = receipt
            wd.processed_at = datetime.now(timezone.utc)
        else:
            # Failed — return funds to wallet
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
