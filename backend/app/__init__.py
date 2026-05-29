from flask import Flask
from .extensions import db, jwt, cors, migrate, scheduler
from .config import config_map
import os


def create_app(env: str | None = None) -> Flask:
    env = env or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)
    app.config.from_object(config_map[env])

    # Extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}}, supports_credentials=True)
    migrate.init_app(app, db)

    # Blueprints
    from .routes.auth import auth_bp
    from .routes.wallet import wallet_bp
    from .routes.orders import orders_bp
    from .routes.plans import plans_bp
    from .routes.withdrawals import withdrawals_bp
    from .routes.referrals import referrals_bp
    from .routes.pool import pool_bp, public_settings_bp
    from .routes.mpesa import mpesa_bp
    from .routes.admin import admin_bp

    for bp in [auth_bp, wallet_bp, orders_bp, plans_bp, withdrawals_bp, referrals_bp, pool_bp, public_settings_bp, mpesa_bp, admin_bp]:
        app.register_blueprint(bp)

    # Scheduler
    from .services.scheduler_service import start_scheduler
    with app.app_context():
        db.create_all()
        _seed_defaults(app)

    start_scheduler(app, scheduler)

    @app.route("/api/health")
    def health():
        return {"status": "ok", "app": "CoinTap"}

    return app


def _seed_defaults(app: Flask):
    """Seed pool, default plans, and platform settings if they don't exist."""
    from .models.pool import PoolSettings
    from .models.plan import Plan
    from .models.settings import PlatformSettings

    if not PoolSettings.query.first():
        db.session.add(PoolSettings(
            public_pool_balance=2_450_000,
            reserve_pool_balance=8_000_000,
            sold_out_floor=50_000,
            batch_release_amount=500_000,
            auto_replenish_enabled=True,
        ))

    if not Plan.query.first():
        plans = [
            Plan(name="Starter Plan", duration_days=4, profit_percent=30, min_amount=500, max_amount=20_000),
            Plan(name="Growth Plan", duration_days=8, profit_percent=65, min_amount=2_000, max_amount=100_000),
            Plan(name="Premium Plan", duration_days=12, profit_percent=95, min_amount=10_000, max_amount=500_000),
        ]
        db.session.add_all(plans)

    if not PlatformSettings.query.first():
        db.session.add(PlatformSettings())  # all defaults: all enabled, maintenance off

    db.session.commit()
