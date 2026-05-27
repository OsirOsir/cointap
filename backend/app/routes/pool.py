from flask import Blueprint
from ..models.pool import PoolSettings
from ..utils.helpers import ok

pool_bp = Blueprint("pool", __name__, url_prefix="/api/pool")


@pool_bp.get("/status")
def pool_status():
    pool = PoolSettings.query.first()
    if not pool:
        return ok(public_pool_balance=0, sold_out=True)
    from decimal import Decimal
    sold_out = Decimal(str(pool.public_pool_balance)) <= Decimal(str(pool.sold_out_floor))
    return ok(pool=pool.to_dict(), sold_out=sold_out)
