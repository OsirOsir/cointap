from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from ..services.order_service import buy_shares
from ..models.order import Order
from ..utils.helpers import current_user, err, ok

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")


@orders_bp.post("/buy")
@jwt_required()
def buy():
    from ..models.settings import get_settings
    settings = get_settings()
    if not settings.share_sale_open:
        return err("Share sales are temporarily closed. Please try again later.", 403)
    if settings.maintenance_mode:
        return err("Platform is in maintenance mode. Please check back shortly.", 503)

    user = current_user()
    d = request.get_json() or {}
    plan_id = d.get("plan_id")
    amount = d.get("amount")
    if not plan_id or not amount:
        return err("plan_id and amount required")
    result = buy_shares(user.id, int(plan_id), float(amount))
    if not result["ok"]:
        return err(result["error"])
    return ok(order=result["order"].to_dict()), 201


@orders_bp.get("/")
@jwt_required()
def list_orders():
    user = current_user()
    status = request.args.get("status")
    q = Order.query.filter_by(user_id=user.id)
    if status:
        q = q.filter_by(status=status)
    orders = q.order_by(Order.created_at.desc()).all()
    return ok(orders=[o.to_dict() for o in orders])


@orders_bp.get("/<int:order_id>")
@jwt_required()
def get_order(order_id: int):
    user = current_user()
    order = Order.query.filter_by(id=order_id, user_id=user.id).first()
    if not order:
        return err("Order not found", 404)
    return ok(order=order.to_dict())
