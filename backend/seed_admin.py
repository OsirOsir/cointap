"""
Seed (or reset) the single CoinTap administrator account.

Usage:
    python seed_admin.py                      # uses env vars or prompts
    ADMIN_EMAIL=admin@cointap.online ADMIN_PASSWORD=YourStrongPass python seed_admin.py

This is safe to run multiple times:
  - If the admin doesn't exist  -> it is created
  - If the admin already exists  -> its password/role is reset to the values given
"""
import os
import sys
import getpass

from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.wallet import Wallet
from app.services.auth_service import hash_password


def main():
    app = create_app()
    with app.app_context():
        email = os.getenv("ADMIN_EMAIL") or input("Admin email [admin@cointap.online]: ").strip() or "admin@cointap.online"
        phone = os.getenv("ADMIN_PHONE") or input("Admin phone [+254700000000]: ").strip() or "+254700000000"
        full_name = os.getenv("ADMIN_NAME") or input("Admin name [CoinTap Admin]: ").strip() or "CoinTap Admin"

        password = os.getenv("ADMIN_PASSWORD")
        if not password:
            password = getpass.getpass("Admin password (input hidden): ").strip()
            confirm = getpass.getpass("Confirm password: ").strip()
            if password != confirm:
                print("❌ Passwords do not match. Aborting.")
                sys.exit(1)

        if len(password) < 8:
            print("❌ Password must be at least 8 characters. Aborting.")
            sys.exit(1)

        email = email.lower().strip()
        existing = User.query.filter_by(email=email).first()

        if existing:
            existing.password_hash = hash_password(password)
            existing.role = "admin"
            existing.is_active = True
            existing.full_name = full_name
            existing.phone = phone
            db.session.commit()
            print(f"✅ Existing admin '{email}' updated (password reset, role=admin).")
        else:
            admin = User(
                full_name=full_name,
                email=email,
                phone=phone,
                password_hash=hash_password(password),
                role="admin",
                is_active=True,
            )
            db.session.add(admin)
            db.session.flush()
            # Give the admin a wallet too
            db.session.add(Wallet(user_id=admin.id))
            db.session.commit()
            print(f"✅ Admin '{email}' created successfully.")

        print("\n──────────────────────────────────────────")
        print(f"  Email : {email}")
        print(f"  Role  : admin")
        print(f"  Login : your frontend /login page")
        print("──────────────────────────────────────────")
        print("⚠️  Store this password securely. It is NOT recoverable from the database (it is hashed).")


if __name__ == "__main__":
    main()
