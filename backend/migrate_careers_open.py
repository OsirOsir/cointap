"""
Migration: add `careers_open` boolean column to platform_settings.

The careers feature adds a toggle that controls whether the public /apply
page accepts new applications. db.create_all() won't add columns to an
existing table, so this small one-shot migration handles it.

Run once on the VPS after deploy:
    cd /var/www/cointap/backend
    source venv/bin/activate
    python migrate_careers_open.py

Safe to run more than once — if the column already exists, the script
detects it and exits cleanly.
"""
import os
import sys
from sqlalchemy import create_engine, inspect, text


def get_db_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        # Fall back to reading from backend/.env
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
    print(f"→ Connecting to database…")
    engine = create_engine(url)
    insp = inspect(engine)

    if "platform_settings" not in insp.get_table_names():
        print("❌ platform_settings table doesn't exist yet — run the app once first.")
        sys.exit(1)

    cols = {c["name"] for c in insp.get_columns("platform_settings")}
    if "careers_open" in cols:
        print("✓ Column 'careers_open' already exists — nothing to do.")
        return

    print("→ Adding column careers_open (default true)…")
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE platform_settings "
            "ADD COLUMN careers_open BOOLEAN NOT NULL DEFAULT TRUE"
        ))
    print("✓ Migration complete.")


if __name__ == "__main__":
    main()
