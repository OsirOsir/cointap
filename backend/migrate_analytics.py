"""
Migration: create the `platform_snapshots` table.

This table holds one row per day with key platform metrics for the
Analytics tab. The table is created automatically by db.create_all() on
backend boot — but explicitly running this migration is safer because:
  - It lets the deploy script log "applied" status
  - It runs BEFORE the backend tries to query the table
  - It's idempotent — safe to re-run

Safe to run multiple times.
"""
import os
import sys
from sqlalchemy import create_engine, inspect, text


def get_db_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        if os.path.exists(env_path):
            for line in open(env_path):
                if line.startswith("DATABASE_URL="):
                    url = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not url:
        print("❌ DATABASE_URL not found in env or backend/.env")
        sys.exit(1)
    return url


def main():
    url = get_db_url()
    print("→ Connecting to database…")
    engine = create_engine(url)
    insp = inspect(engine)

    if "platform_snapshots" in insp.get_table_names():
        print("✓ Table 'platform_snapshots' already exists — nothing to do.")
        return

    print("→ Creating platform_snapshots table…")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE platform_snapshots (
                id SERIAL PRIMARY KEY,
                snapshot_date DATE UNIQUE NOT NULL,
                total_users INTEGER DEFAULT 0,
                active_investors INTEGER DEFAULT 0,
                new_signups INTEGER DEFAULT 0,
                deposits_volume NUMERIC(14, 2) DEFAULT 0,
                withdrawals_volume NUMERIC(14, 2) DEFAULT 0,
                orders_count INTEGER DEFAULT 0,
                orders_volume NUMERIC(14, 2) DEFAULT 0,
                pool_balance NUMERIC(14, 2),
                total_wallet_balance NUMERIC(14, 2),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX idx_snapshot_date ON platform_snapshots(snapshot_date)"))
    print("✓ Migration complete.")
    print("→ Backfill will run automatically on next backend start.")


if __name__ == "__main__":
    main()
