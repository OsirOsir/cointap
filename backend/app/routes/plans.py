from flask import Blueprint
from flask_jwt_extended import jwt_required
from ..models.plan import Plan
from ..utils.helpers import ok

plans_bp = Blueprint("plans", __name__, url_prefix="/api/plans")


@plans_bp.get("/")
def get_plans():
    plans = Plan.query.filter_by(is_active=True).order_by(Plan.duration_days).all()
    return ok(plans=[p.to_dict() for p in plans])
