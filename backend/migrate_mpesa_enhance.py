"""
Migration: enhance `mpesa_logs` with reconciliation + audit fields.

New columns:
  - merchant_request_id  : Daraja's secondary tracking ID
  - result_code          : numeric outcome code (0 = success, others = various failures)
  - result_desc          : human-readable Daraja message
  - completed_at         : when the log reached its final state
  - reconciled_at        : last time the scheduler queried Daraja about it

Safe to run multiple times — checks for column existence first.
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

    existing = {c["name"] for c in insp.get_columns("mpesa_logs")}

    to_add = [
        ("merchant_request_id", "VARCHAR(100)"),
        ("result_code",         "INTEGER"),
        ("result_desc",         "VARCHAR(255)"),
        ("completed_at",        "TIMESTAMP"),
        ("reconciled_at",       "TIMESTAMP"),
    ]

    new_count = 0
    with engine.begin() as conn:
        for name, sqltype in to_add:
            if name in existing:
                print(f"✓ mpesa_logs.{name} already exists")
                continue
            print(f"→ Adding mpesa_logs.{name} ({sqltype})…")
            conn.execute(text(f"ALTER TABLE mpesa_logs ADD COLUMN {name} {sqltype}"))
            new_count += 1

        # Useful indexes for the reconciliation queries
        existing_idx = {ix["name"] for ix in insp.get_indexes("mpesa_logs")}
        if "ix_mpesa_logs_status" not in existing_idx:
            print("→ Adding index on mpesa_logs.status…")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_mpesa_logs_status ON mpesa_logs(status)"))
        if "ix_mpesa_logs_transaction_type" not in existing_idx:
            print("→ Adding index on mpesa_logs.transaction_type…")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_mpesa_logs_transaction_type ON mpesa_logs(transaction_type)"))
        if "ix_mpesa_logs_user_id" not in existing_idx:
            print("→ Adding index on mpesa_logs.user_id…")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_mpesa_logs_user_id ON mpesa_logs(user_id)"))

    print(f"✓ Migration complete ({new_count} new column(s) added).")


if __name__ == "__main__":
    main()
