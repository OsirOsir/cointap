"""
Migration: add `milestone_counts_signups` column to platform_settings.

Defaults FALSE — keeps existing behaviour. Admin can flip it on in Settings
when running a growth campaign.

Safe to run multiple times — checks for column existence.
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

    if "platform_settings" not in insp.get_table_names():
        print("❌ platform_settings table doesn't exist yet — run the app once first.")
        sys.exit(1)

    cols = {c["name"] for c in insp.get_columns("platform_settings")}
    if "milestone_counts_signups" in cols:
        print("✓ Column 'milestone_counts_signups' already exists — nothing to do.")
        return

    print("→ Adding column milestone_counts_signups (default false)…")
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE platform_settings "
            "ADD COLUMN milestone_counts_signups BOOLEAN NOT NULL DEFAULT FALSE"
        ))
    print("✓ Migration complete.")


if __name__ == "__main__":
    main()
