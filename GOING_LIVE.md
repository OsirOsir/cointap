# 🔌 CoinTap — Going Live: Real Auth Setup

This guide turns CoinTap from demo mode into a **real platform** with:
- ✅ One admin account (`admin@cointap.online`)
- ✅ Real user signup / login (PostgreSQL + bcrypt + JWT)
- ✅ No dummy data

Follow these steps **in order**.

---

## 1. Set Up the Database

You said PostgreSQL is installed. Create the database and user:

```bash
sudo -u postgres psql
```

Then inside the psql prompt:

```sql
CREATE USER cointap WITH PASSWORD 'cointap';
CREATE DATABASE cointap OWNER cointap;
GRANT ALL PRIVILEGES ON DATABASE cointap TO cointap;
\q
```

> If you prefer different credentials, update `DATABASE_URL` in `.env` to match.

---

## 2. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and set **at minimum**:

```bash
SECRET_KEY=<paste a long random string>
JWT_SECRET_KEY=<paste another long random string>
DATABASE_URL=postgresql://cointap:cointap@localhost:5432/cointap
ADMIN_EMAIL=admin@cointap.online
ADMIN_PASSWORD=<your strong admin password>
```

**Generate strong secrets quickly:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Run it twice — once for `SECRET_KEY`, once for `JWT_SECRET_KEY`.

---

## 3. Install Backend Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## 4. Start the Backend (creates tables automatically)

```bash
python run.py
```

You should see Flask start on **http://localhost:5000**. The database tables are auto-created on first run.

Test it works — in another terminal:
```bash
curl http://localhost:5000/api/health
# → {"status": "ok", "app": "CoinTap"}
```

Leave this running.

---

## 5. Seed Your Admin Account

In a **new terminal** (with venv active):

```bash
cd backend
source venv/bin/activate
python seed_admin.py
```

It reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. You'll see:

```
✅ Admin 'admin@cointap.online' created successfully.
```

> Run this again any time to **reset the admin password** — it updates the existing admin instead of creating a duplicate.

---

## 6. Start the Frontend

In a **third terminal**:

```bash
cd frontend
npm install        # if you haven't already
npm run dev
```

Open **http://localhost:3000**

---

## 7. Test the Full Flow

### As Admin
1. Go to `/login`
2. Enter `admin@cointap.online` + your password
3. You land on the **Admin panel** (role comes from the database)

### As a Real User
1. Go to `/register`
2. Fill in name, email, phone, strong password
3. Account is created in PostgreSQL with a hashed password
4. You're logged in and land on the **Dashboard**
5. Logout, login again — works because it's real

### Verify in the database
```bash
sudo -u postgres psql cointap -c "SELECT id, email, role FROM users;"
```
You'll see your admin + any users who signed up. Real data. ✅

---

## How It Works Now

| Action | What happens |
|--------|-------------|
| **Register** | `POST /api/auth/register` → bcrypt-hashes password → saves user + wallet to PostgreSQL → returns JWT |
| **Login** | `POST /api/auth/login` → verifies bcrypt hash → returns JWT access + refresh tokens |
| **Session** | JWT stored in localStorage; auto-restored on page refresh; auto-refreshes when expired |
| **Admin role** | Comes from the `role` column in the database — cannot be faked from the browser |
| **Logout** | Clears tokens |

---

## Security Notes

- ✅ Passwords are **bcrypt-hashed** — never stored in plain text
- ✅ Admin role is **server-side** — users can't make themselves admin via DevTools
- ✅ JWT access tokens expire in 15 min; refresh tokens in 7 days
- ⚠️ Before real deployment: use HTTPS, set strong secrets, lock CORS to your domain

---

## What's Still Demo (migrate later)

These pages still use mock data until you wire them to the API (the `api.ts` wrappers are ready):
- Wallet deposits (needs M-Pesa keys)
- Buying shares / orders
- Withdrawals
- Admin user management tables

Auth (register/login/logout/session) is **fully real**. That's the foundation. We can migrate the rest page-by-page next.

---

## Troubleshooting

**"connection refused" on login**
→ Backend isn't running. Start it: `cd backend && python run.py`

**"role cointap does not exist"**
→ Database user not created. Redo Step 1.

**Login says "Invalid email or password" for admin**
→ Re-run `python seed_admin.py` to reset the password.

**CORS error in browser console**
→ Make sure `FRONTEND_URL=http://localhost:3000` in `.env` and restart backend.

**Frontend can't reach backend**
→ The Vite proxy forwards `/api` → `localhost:5000`. Make sure both are running.
