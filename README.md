# MJ Transport ERP

A production-ready base project for a Transportation ERP system.

**Stack**
- Frontend: Vue 3 + Vite + TypeScript + Vuetify 3 + Pinia + Vue Router + Axios + ApexCharts + VeeValidate + Zod
- Backend: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL + JWT + bcrypt + Multer
- No Docker, no Redis, no microservices.

---

## 1. Prerequisites

Install these on your machine before starting:

- **Node.js** 18 LTS or newer (includes npm) — https://nodejs.org
- **PostgreSQL** 14+ — https://www.postgresql.org/download/
- A terminal / shell (bash, zsh, or PowerShell)

Verify installs:

```bash
node -v
npm -v
psql --version
```

---

## 2. PostgreSQL Installation & Database Creation

### macOS (Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Ubuntu / Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download and run the installer from https://www.postgresql.org/download/windows/ and remember the password you set for the `postgres` superuser.

### Create the database

Open `psql` (or any PostgreSQL client) and run:

```sql
CREATE DATABASE mj_transport_erp;
```

Or from the shell:

```bash
psql -U postgres -c "CREATE DATABASE mj_transport_erp;"
```

---

## 3. Backend Setup

```bash
cd transport-erp/backend
npm install
```

### Environment Variables

Copy the example file and edit it with your local PostgreSQL credentials:

```bash
cp .env.example .env
```

`.env` contents:

```
NODE_ENV=development
PORT=5000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mj_transport_erp?schema=public"

JWT_ACCESS_SECRET=change_this_access_secret_key
JWT_REFRESH_SECRET=change_this_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```

Update `DATABASE_URL` with your actual PostgreSQL username, password, host, and port.
Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to any long random strings for real deployments.

### Run Prisma Migration

This creates all tables (`users`, `roles`, `permissions`, `role_permissions`, `user_roles`) in your database:

```bash
npx prisma migrate dev --name init
```

### Seed the Database

This creates all roles, permissions, and the Super Admin user:

```bash
npm run seed
```

You should see:
```
Seeding complete.
Login with username: admin, password: Admin@123
```

### Run the Backend

```bash
npm run dev
```

The API will start on **http://localhost:5000**. Health check: `GET http://localhost:5000/health`

---

## 4. Frontend Setup

Open a **second terminal**:

```bash
cd transport-erp/frontend
npm install
```

### Environment Variables

```bash
cp .env.example .env
```

`.env` contents:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### Run the Frontend

```bash
npm run dev
```

The app will start on **http://localhost:5173**.

---

## 5. Login

Open your browser at **http://localhost:5173** — you'll be redirected to the login page.

```
Username: admin
Password: Admin@123
```

After login you'll land on the **Dashboard**, with a sidebar containing Dashboard, Operations, Fleet, Accounts, Reports, Masters, and Administration. Only Dashboard is fully wired to live data; the others are placeholder pages ready for future development.

---

## 6. Folder Structure

```
transport-erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (users, roles, permissions, etc.)
│   │   └── seed.ts              # Seeds roles, permissions, and Super Admin user
│   ├── src/
│   │   ├── config/              # env, db (Prisma client), logger
│   │   ├── controllers/         # auth, user, dashboard controllers
│   │   ├── middlewares/         # auth, authorize (RBAC), error handler, validate
│   │   ├── routes/               # /api/auth, /api/users, /api/dashboard
│   │   ├── services/            # business logic
│   │   ├── repositories/        # Prisma data access (Repository Pattern)
│   │   ├── validators/          # Zod schemas per route
│   │   ├── utils/               # jwt helpers, response helper, asyncHandler
│   │   ├── app.ts               # Express app (middleware, routes)
│   │   └── server.ts            # Entry point
│   ├── uploads/                 # Multer upload target
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/          # Reusable UI components (StatCard, etc.)
│   │   ├── layouts/             # AdminLayout (sidebar, navbar, footer)
│   │   ├── pages/                # Login, Dashboard, placeholder modules, 404, 401
│   │   ├── plugins/              # Vuetify instance + theme
│   │   ├── router/                # Route definitions + auth guards
│   │   ├── services/             # Axios instance + API service modules
│   │   ├── stores/                # Pinia stores (auth, users, dashboard)
│   │   ├── types/                 # Shared TypeScript types
│   │   ├── utils/                 # Zod validators, formatters
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md
```

---

## 7. API Reference

| Method | Endpoint            | Auth | Description                  |
|--------|----------------------|------|-------------------------------|
| POST   | /api/auth/login      | No   | Login, returns access + refresh tokens |
| POST   | /api/auth/logout     | Yes  | Invalidates refresh token     |
| POST   | /api/auth/refresh    | No   | Exchanges refresh token for new access token |
| GET    | /api/auth/me         | Yes  | Returns current user profile  |
| GET    | /api/dashboard       | Yes (`dashboard.view`) | Dashboard summary data |
| GET    | /api/users           | Yes (`users.view`)     | List users |
| POST   | /api/users           | Yes (`users.create`)   | Create user |
| PUT    | /api/users/:id        | Yes (`users.update`)   | Update user |
| DELETE | /api/users/:id        | Yes (`users.delete`)   | Delete user |

All authenticated requests require:
```
Authorization: Bearer <accessToken>
```

---

## 8. Roles & Permissions Seeded

**Roles:** SUPER_ADMIN, ADMIN, OPERATIONS, ACCOUNTS, FLEET_MANAGER, DRIVER, CUSTOMER

**Permissions:** dashboard.view, users.view, users.create, users.update, users.delete, operations.view, fleet.view, accounts.view, reports.view, masters.view, administration.view

`SUPER_ADMIN` is granted every permission automatically (bypasses individual permission checks in the `authorize()` middleware). `ADMIN` is seeded with `dashboard.view` as a starting point — extend `prisma/seed.ts` to assign more permissions to other roles as you build out each module.

---

## 9. Notes for Extending This Base

- Trip, Vehicle, Invoice, and Customer models are not yet in the schema — the Dashboard currently serves demo/static numbers from `dashboard.service.ts`. Add real models to `schema.prisma`, run a new migration, and replace the service logic with real Prisma aggregation queries.
- The `authorize(permission)` middleware is reusable across any new route — just add new permission strings to the seed file and check for them.
- Sidebar modules (Operations, Fleet, Accounts, Reports, Masters, Administration) are placeholder pages — build real pages under `frontend/src/pages/` and wire matching backend routes/permissions as needed.
- Uploaded files are handled via Multer and served statically from `/uploads`.

---

## 10. Troubleshooting

- **`P1001: Can't reach database server`** — confirm PostgreSQL is running and `DATABASE_URL` in `backend/.env` matches your local credentials/port.
- **CORS errors in the browser** — confirm `CORS_ORIGIN` in `backend/.env` matches the frontend URL (default `http://localhost:5173`).
- **401 on every request** — check that the frontend `.env` `VITE_API_BASE_URL` points to the running backend, and that you're logged in (token stored in `localStorage`).
- **Port already in use** — change `PORT` in `backend/.env` or the frontend `server.port` in `vite.config.ts`, keeping both `.env` files in sync.
