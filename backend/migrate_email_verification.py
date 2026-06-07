"""
Migration: add email verification.

Two changes:
  1. Add `email_verified` (boolean, default false) + `email_verified_at` to users
  2. Add `email_verification_required` + `verification_required_at` to platform_settings
  3. Create `email_verification_tokens` table

Safe to run multiple times — checks for column/table existence first.
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

    # 1. users.email_verified
    user_cols = {c["name"] for c in insp.get_columns("users")}
    with engine.begin() as conn:
        if "email_verified" not in user_cols:
            print("→ Adding users.email_verified (default false)…")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            # Backfill: existing users have been using the platform, treat
            # them as verified to avoid locking anyone out
            conn.execute(text("UPDATE users SET email_verified = TRUE"))
            print("  ✓ Backfilled existing users as verified")
        else:
            print("✓ users.email_verified already exists")

        if "email_verified_at" not in user_cols:
            print("→ Adding users.email_verified_at…")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP"
            ))
        else:
            print("✓ users.email_verified_at already exists")

    # 2. platform_settings.email_verification_required + verification_required_at
    settings_cols = {c["name"] for c in insp.get_columns("platform_settings")}
    with engine.begin() as conn:
        if "email_verification_required" not in settings_cols:
            print("→ Adding platform_settings.email_verification_required (default false)…")
            conn.execute(text(
                "ALTER TABLE platform_settings "
                "ADD COLUMN email_verification_required BOOLEAN NOT NULL DEFAULT FALSE"
            ))
        else:
            print("✓ platform_settings.email_verification_required already exists")

        if "verification_required_at" not in settings_cols:
            print("→ Adding platform_settings.verification_required_at…")
            conn.execute(text(
                "ALTER TABLE platform_settings ADD COLUMN verification_required_at TIMESTAMP"
            ))
        else:
            print("✓ platform_settings.verification_required_at already exists")

    # 3. email_verification_tokens table
    insp = inspect(engine)   # refresh after schema changes
    if "email_verification_tokens" not in insp.get_table_names():
        print("→ Creating email_verification_tokens table…")
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE email_verification_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    email VARCHAR(120) NOT NULL,
                    token_hash VARCHAR(64) UNIQUE NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    expires_at TIMESTAMP NOT NULL,
                    used_at TIMESTAMP,
                    request_ip VARCHAR(45)
                )
            """))
            conn.execute(text("CREATE INDEX idx_evt_user_id ON email_verification_tokens(user_id)"))
            conn.execute(text("CREATE INDEX idx_evt_token_hash ON email_verification_tokens(token_hash)"))
    else:
        print("✓ Table 'email_verification_tokens' already exists")

    print("✓ Migration complete.")


if __name__ == "__main__":
    main()
