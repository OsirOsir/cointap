from flask import Blueprint, request
from ..services.mpesa_service import handle_stk_callback, handle_b2c_callback

mpesa_bp = Blueprint("mpesa", __name__, url_prefix="/api/mpesa")


@mpesa_bp.post("/stk-callback")
def stk_callback():
    handle_stk_callback(request.get_json() or {})
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@mpesa_bp.post("/b2c-callback")
def b2c_callback():
    handle_b2c_callback(request.get_json() or {})
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@mpesa_bp.post("/b2c-timeout")
def b2c_timeout():
    # Log timeout, retry logic can be added here
    return {"ResultCode": 0, "ResultDesc": "Accepted"}
