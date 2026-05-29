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


# Public platform settings — used by the frontend to detect maintenance mode
# and decide whether to show toggles to users. NO auth required (read-only,
# only safe fields are exposed).
public_settings_bp = Blueprint("public_settings", __name__, url_prefix="/api")


@public_settings_bp.get("/settings")
def public_settings():
    from ..models.settings import get_settings
    s = get_settings()
    # Expose only the user-relevant fields
    return ok(settings={
        "deposits_enabled": s.deposits_enabled,
        "withdrawals_enabled": s.withdrawals_enabled,
        "registrations_open": s.registrations_open,
        "share_sale_open": s.share_sale_open,
        "maintenance_mode": s.maintenance_mode,
        "maintenance_message": s.maintenance_message,
    })


@public_settings_bp.get("/announcements/active")
def public_active_announcements():
    """Return active announcements ordered newest-first. Used by user Dashboard."""
    from ..models.announcement import Announcement
    items = (
        Announcement.query
        .filter_by(is_active=True)
        .order_by(Announcement.created_at.desc())
        .limit(5)
        .all()
    )
    return ok(announcements=[a.to_dict() for a in items])
