"""
Migration: add `welcome_email_sent_at` column to users.

Tracks the one-shot welcome email so it never sends twice (e.g. user
verifies → re-verifies somehow → only first attempt sends welcome).

For existing users, we set welcome_email_sent_at to their created_at so
we don't suddenly spam them with a "welcome!" email today. This is a
one-time backfill — only new users (or users who clear this manually)
will receive a welcome.

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

    user_cols = {c["name"] for c in insp.get_columns("users")}
    if "welcome_email_sent_at" in user_cols:
        print("✓ Column 'users.welcome_email_sent_at' already exists — nothing to do.")
        return

    print("→ Adding users.welcome_email_sent_at…")
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN welcome_email_sent_at TIMESTAMP"
        ))
        # Backfill existing users so we don't spam them with welcomes
        conn.execute(text(
            "UPDATE users SET welcome_email_sent_at = created_at "
            "WHERE welcome_email_sent_at IS NULL"
        ))
        print("  ✓ Backfilled existing users (no welcome will be sent to them)")
    print("✓ Migration complete.")


if __name__ == "__main__":
    main()
