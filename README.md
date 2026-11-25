# Attendra

Multi-company attendance, leave and HR SaaS (React + Vite frontend, Express API on Vercel, PostgreSQL/Neon).

## How it is organised

- **Companies (tenants)** — every customer company has its own isolated data (`company_id` on every row).
  Companies sign up themselves (14-day free trial) or are created by the platform owner.
- **Roles** — `platform_admin` (you, manages all companies) · `super_admin` (company owner) · `admin` (HR) · `employee`.
- **All data lives on the server.** The browser stores only the login token.

```
server.ts                 Express app (routes + security headers + error handler)
server/db.ts              Postgres pool + versioned migrations (append-only)
server/auth.ts            JWT sessions, role guards, rate limiting, company access (trial/suspended)
server/company.ts         Plans, company creation, default settings
server/records.ts         Company-scoped document store (employees, attendance, leave, …)
server/routes/*.ts        auth · public · data (company app) · platform (owner panel) · ai
src/                      React app
tests/api.test.ts         End-to-end API + tenant-isolation tests (needs a throwaway Postgres DB)
```

## Environment variables (Vercel)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Separate databases for Production and Preview |
| `JWT_SECRET` | yes | Long random string |
| `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` | first run | Creates the platform owner account if none exists |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | for email | Without them, temporary passwords are shown on screen instead |
| `GEMINI_API_KEY` | optional | AI insights |
| `APP_URL` | optional | Link used in emails (defaults to attendra-sage.vercel.app) |
| `VITE_SUPPORT_WHATSAPP` / `VITE_SUPPORT_EMAIL` | optional | Shown when a trial ends |

## Run locally

```bash
npm install
DATABASE_URL=postgres://… JWT_SECRET=dev-secret npm run dev
npm run lint          # type check
TEST_DATABASE_URL=postgres://…/empty_db npm test
```

Migrations run automatically on the first request. Upgrading from the old single-company version moves
existing users and employees into a company called "My Company" (old tables are kept as `legacy_*`).
