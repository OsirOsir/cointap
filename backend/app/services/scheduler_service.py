from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask


def start_scheduler(app: Flask, scheduler: BackgroundScheduler):
    if scheduler.running:
        return

    def maturity_job():
        with app.app_context():
            from .order_service import settle_matured_orders
            count = settle_matured_orders()
            if count:
                app.logger.info(f"[Scheduler] Settled {count} matured order(s)")

    def pool_release_job():
        with app.app_context():
            from ..models.pool import PoolSettings
            from ..extensions import db
            from decimal import Decimal

            pool = PoolSettings.query.first()
            if not pool:
                return
            if not pool.auto_replenish_enabled:
                return
            if Decimal(str(pool.public_pool_balance)) <= Decimal(str(pool.sold_out_floor)):
                batch = min(
                    Decimal(str(pool.batch_release_amount)),
                    Decimal(str(pool.reserve_pool_balance)),
                )
                if batch > 0:
                    pool.public_pool_balance = Decimal(str(pool.public_pool_balance)) + batch
                    pool.reserve_pool_balance = Decimal(str(pool.reserve_pool_balance)) - batch
                    from datetime import datetime, timezone
                    pool.last_release_at = datetime.now(timezone.utc)
                    db.session.commit()
                    app.logger.info(f"[Scheduler] Released pool batch Ksh {batch:,.0f}")

    def snapshot_job():
        """Write today's platform snapshot row. Runs every 30 minutes so
        the Analytics tab always shows fresh point-in-time numbers (pool
        balance, total wallet balance) without waiting for tomorrow.
        Daily metrics (signups, deposits, etc.) are computed cumulatively
        for the current day, so re-running is idempotent and accurate.
        """
        with app.app_context():
            try:
                from .snapshot_service import write_todays_snapshot
                write_todays_snapshot()
            except Exception as e:
                app.logger.error(f"[Scheduler] Snapshot job failed: {e}")

    # Run every 60 seconds
    scheduler.add_job(maturity_job, "interval", seconds=60, id="maturity_job", replace_existing=True)
    # Run every 5 minutes
    scheduler.add_job(pool_release_job, "interval", seconds=300, id="pool_release_job", replace_existing=True)
    # Run every 30 minutes
    scheduler.add_job(snapshot_job, "interval", minutes=30, id="snapshot_job", replace_existing=True)

    scheduler.start()
    app.logger.info("[Scheduler] Started — maturity (60s), pool release (300s), snapshot (30m)")

    # First-boot backfill — runs once if the snapshots table is empty
    try:
        from .snapshot_service import backfill_from_existing
        backfill_from_existing(app)
        # Also write today's snapshot immediately so the Analytics tab works
        # right away after deploy, without waiting 30 minutes.
        with app.app_context():
            from .snapshot_service import write_todays_snapshot
            write_todays_snapshot()
    except Exception as e:
        app.logger.error(f"[Scheduler] Snapshot bootstrap failed: {e}")
