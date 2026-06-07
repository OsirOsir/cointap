"""
Migration: create the `password_reset_tokens` table.

Stores SHA-256 hashes of password reset tokens (not the raw values).
One-shot tokens with a 1-hour expiry.

Safe to run multiple times — checks for table existence first.
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

    if "password_reset_tokens" in insp.get_table_names():
        print("✓ Table 'password_reset_tokens' already exists — nothing to do.")
        return

    print("→ Creating password_reset_tokens table…")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(64) UNIQUE NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                request_ip VARCHAR(45)
            )
        """))
        conn.execute(text("CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id)"))
        conn.execute(text("CREATE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash)"))
    print("✓ Migration complete.")


if __name__ == "__main__":
    main()
