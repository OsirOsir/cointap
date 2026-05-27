# CoinTap — Centralized Crypto Investment Platform

**Domain:** cointap.trade  
**Stack:** Flask 3 · PostgreSQL · React 18 + Vite · Tailwind CSS · JWT · APScheduler · M-Pesa Daraja  
**Tagline:** Deposit · Invest · Grow · Withdraw

---

## Project Structure

```
cointap/
├── frontend/          React 18 + Vite SPA
│   └── src/
│       ├── components/cointap/   Logo, NodeBackground, Countdown, AuthShell, AppLayout
│       ├── pages/                Landing, Login, Register, Dashboard, Wallet,
│       │                         Plans, Orders, Referrals, Withdraw, Admin
│       ├── lib/cointap-store.ts  Centralized mock store (swap → Flask API)
│       └── App.tsx               React Router v6 routes
│
└── backend/           Flask 3 REST API
    ├── app/
    │   ├── models/    User, Wallet, WalletTransaction, Plan, Order,
    │   │              Withdrawal, Referral, PoolSettings, MpesaLog
    │   ├── routes/    auth, wallet, orders, plans, withdrawals,
    │   │              referrals, pool, mpesa, admin
    │   ├── services/  auth_service, wallet_service, order_service,
    │   │              mpesa_service, scheduler_service
    │   └── utils/     helpers, decorators
    ├── migrations/    Alembic
    └── run.py         Entry point
```

---

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:3000
```

The frontend runs fully with its built-in mock store — **no backend required** for UI development.  
To connect to the real API, replace `store.*` calls in `src/lib/cointap-store.ts` with `fetch('/api/...')`.

---

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate         # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY at minimum
```

**Create the PostgreSQL database:**
```bash
psql -U postgres
CREATE USER cointap WITH PASSWORD 'cointap';
CREATE DATABASE cointap OWNER cointap;
\q
```

**Run the app (auto-creates all tables and seeds default data):**
```bash
python run.py
# Flask API starts on http://localhost:5000
```

**Or run with Gunicorn (production):**
```bash
gunicorn "app:create_app()" -w 4 -b 0.0.0.0:5000
```

---

### 4. Run Both Together

Terminal 1 — Backend:
```bash
cd backend && source venv/bin/activate && python run.py
```

Terminal 2 — Frontend:
```bash
cd frontend && npm run dev
```

Open **http://localhost:3000**

---

## Demo Login

The frontend mock store works without any backend.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@cointap.trade` | any |
| User | `user@example.com` | any |

> Any email containing "admin" logs in as admin.

---

## Core User Flow

```
Register → Wallet Created → Deposit (M-Pesa STK Push)
→ Buy Shares (select plan, amount deducted from wallet + pool)
→ Live Countdown Timer
→ Auto-Settle on Maturity (wallet credited principal + profit)
→ Withdraw (request → admin approves → M-Pesa B2C sent)
```

---

## API Reference

All endpoints prefixed `/api/`. JWT required unless noted.

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ✗ | Register + init wallet |
| POST | `/auth/login` | ✗ | Login, get JWT tokens |
| POST | `/auth/refresh` | Refresh JWT | New access token |
| GET | `/auth/me` | ✓ | Current user profile |
| PUT | `/auth/me` | ✓ | Update name/phone/password |

### Wallet
| Method | Endpoint | Description |
|---|---|---|
| GET | `/wallet/` | Balance + totals |
| GET | `/wallet/transactions` | Paginated history |
| POST | `/wallet/deposit/initiate` | Trigger STK Push |
| POST | `/wallet/deposit/callback` | Daraja callback (public) |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/buy` | Buy shares |
| GET | `/orders/` | List user orders |
| GET | `/orders/:id` | Single order |

### Withdrawals
| Method | Endpoint | Description |
|---|---|---|
| POST | `/withdrawals/request` | Request withdrawal |
| GET | `/withdrawals/` | Withdrawal history |

### Admin (role=admin required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard` | Platform stats |
| GET | `/admin/users` | All users |
| PUT | `/admin/users/:id/wallet` | Credit/debit wallet |
| GET | `/admin/orders` | All orders |
| PUT | `/admin/orders/:id/force-mature` | Force settle |
| GET | `/admin/withdrawals` | Withdrawal queue |
| PUT | `/admin/withdrawals/:id/approve` | Approve + fire B2C |
| PUT | `/admin/withdrawals/:id/reject` | Reject + refund |
| POST | `/admin/plans` | Create plan |
| PUT | `/admin/plans/:id` | Edit/toggle plan |
| PUT | `/admin/pool` | Update pool settings |
| POST | `/admin/pool/release-batch` | Release reserve batch |

### M-Pesa Callbacks (public)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/mpesa/stk-callback` | STK Push result |
| POST | `/mpesa/b2c-callback` | B2C result |
| POST | `/mpesa/b2c-timeout` | B2C timeout |

---

## M-Pesa Integration (Production)

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app — get `Consumer Key` and `Consumer Secret`
3. Set all `MPESA_*` values in `.env`
4. Set `MPESA_ENVIRONMENT=production` when going live
5. Expose your server via HTTPS (required for callbacks) — use Nginx + Let's Encrypt

**Deposit flow:**  
User clicks Deposit → POST `/api/wallet/deposit/initiate` → Daraja STK Push → PIN prompt on phone → Daraja POSTs to `/api/mpesa/stk-callback` → wallet credited

**Withdrawal flow:**  
User requests → Admin approves → POST `/api/admin/withdrawals/:id/approve` → Daraja B2C → Daraja POSTs to `/api/mpesa/b2c-callback` → withdrawal marked Paid

---

## Scheduler Jobs

| Job | Interval | Action |
|---|---|---|
| `maturity_job` | Every 60s | Find Active orders past `matures_at`, settle + credit wallet |
| `pool_release_job` | Every 300s | If pool ≤ floor and reserve available, release batch |

---

## Database Tables

`users` · `wallets` · `wallet_transactions` · `plans` · `orders` · `withdrawals` · `referrals` · `pool_settings` · `mpesa_logs`

Tables are auto-created on first `python run.py`. For production use Alembic migrations:
```bash
flask db init
flask db migrate -m "initial"
flask db upgrade
```

---

## Build & Deploy (Production)

```bash
# Frontend build
cd frontend && npm run build   # outputs to dist/

# Serve with Nginx
# Point /api/* → Gunicorn on port 5000
# Point /* → frontend dist/index.html

# Backend
gunicorn "app:create_app()" -w 4 -b 127.0.0.1:5000 --daemon
```

Sample Nginx config:
```nginx
server {
    listen 443 ssl;
    server_name cointap.trade;

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    location / {
        root /var/www/cointap/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Security Notes

- Passwords hashed with bcrypt
- JWT access tokens expire in 15 minutes; refresh tokens in 7 days
- All admin routes require `role=admin` in JWT
- Wallet updates are atomic — no balance change without a transaction log
- M-Pesa callbacks should validate `ResultCode` and Shortcode
- Rate limiting (Flask-Limiter) recommended on `/auth/login` and `/wallet/deposit/initiate`
- Set `FLASK_ENV=production` and strong `SECRET_KEY` before go-live

---

## Connecting Frontend to Backend

The frontend currently uses `src/lib/cointap-store.ts` as a mock store.  
To connect to the real Flask API, replace each `store.*` call with the corresponding `fetch('/api/...')` call from the API reference above.  
All endpoints mirror the store methods exactly by design.

---

*© 2026 CoinTap · cointap.trade*
