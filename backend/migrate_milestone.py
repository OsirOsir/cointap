"""
One-time migration: add columns for the referral milestone bonus feature.

Run:
    cd backend
    source venv/bin/activate
    python migrate_milestone.py

Safe to re-run.
"""

from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine, text, inspect


def main():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in your .env file")

    engine = create_engine(database_url)

    added = []

    with engine.begin() as conn:
        inspector = inspect(conn)

        user_columns = [c["name"] for c in inspector.get_columns("users")]
        settings_columns = [c["name"] for c in inspector.get_columns("platform_settings")]

        if "milestone_bonus_at" not in user_columns:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN milestone_bonus_at TIMESTAMP NULL"
            ))
            added.append("users.milestone_bonus_at")

        if "referral_milestone_threshold" not in settings_columns:
            conn.execute(text(
                "ALTER TABLE platform_settings "
                "ADD COLUMN referral_milestone_threshold INTEGER NOT NULL DEFAULT 10"
            ))
            added.append("platform_settings.referral_milestone_threshold")

        if "referral_milestone_amount" not in settings_columns:
            conn.execute(text(
                "ALTER TABLE platform_settings "
                "ADD COLUMN referral_milestone_amount NUMERIC(14, 2) NOT NULL DEFAULT 100"
            ))
            added.append("platform_settings.referral_milestone_amount")

    if added:
        print("✅ Migration applied. Added columns:")
        for c in added:
            print(f"   + {c}")
    else:
        print("✅ No changes needed — all columns already exist.")


if __name__ == "__main__":
    main()