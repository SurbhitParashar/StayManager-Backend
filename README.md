# StayManager Backend

Express / PostgreSQL API hosted on Render. Requires Node 22?24 and an existing StayManager database (the baseline does not create legacy users/properties/bookings tables).

## Local setup

Copy `.env.example` to `.env`, configure DATABASE_URL and a JWT_SECRET of at least 32 characters, then run:

```sh
npm ci
npm test
npm run db:migrate:status
npm run db:migrate:dry-run
npm run db:migrate
npm start
```

## Roles

| Capability | Viewer | Manager | Admin |
| --- | --- | --- | --- |
| Read reservations, guests, properties, contacts, events, reports | Yes | Yes | Yes |
| Create/edit business records, financials, payments, agreements, reviews | No | Yes | Yes |
| Delete business records | No | No | Yes |
| Create accounts, change roles, disable accounts | No | No | Yes |

The RBAC migration preserves existing admin, manager, and viewer roles. Null or unknown legacy roles become viewers, and new accounts default to viewer. If no active admin exists, the first active user ordered by user_id becomes admin. Confirm the active administrators before rollout. If there are no active users, provision an admin through an operator-controlled database session before launch. Existing sessions must sign in again after migration.

GET /api/auth/me returns the current user and server-computed permissions. POST /api/auth/logout revokes all sessions for that account. Every protected request reloads role/active status and checks the session version. Role/status changes revoke existing sessions. The last active admin cannot be disabled or demoted; access changes are audited in user_access_audit.

Admin endpoints: GET/POST /api/users and PATCH /api/users/:id/access with `{ "role": "viewer", "is_active": true }`. Account creation requires a password of at least 12 characters and at most 72 UTF-8 bytes. There is no public signup.

All API writes require an Origin header exactly matching CORS_ORIGINS. This includes non-browser clients. Sessions use HttpOnly cookies. Login is limited to 30 attempts per IP per 15 minutes per server instance; use a shared edge limiter when scaling.

## Render deployment

Use the existing service connected to SurbhitParashar/StayManager-Backend. Configure build `npm ci`, start `npm run db:migrate && npm start`, and health check `/health`. Set NODE_ENV=production, DATABASE_URL, JWT_SECRET, CORS_ORIGINS=https://stay-manager-frontend.vercel.app, COOKIE_SECURE=true, COOKIE_SAME_SITE=lax. Include exact preview/custom origins when testing them. Never use a wildcard origin with credentials.

`render.yaml` describes a free web service for importing as a Blueprint. It does not modify an existing manually configured service until adopted. Reuse the existing service instead of creating a duplicate. Preserve its DATABASE_URL and JWT_SECRET. Migrations run at startup because preDeployCommand requires paid compute; a failed migration prevents startup. For a paid service, move migration execution to preDeployCommand. Auto-deploy is configured to wait for GitHub checks.

Before release: take a database backup, confirm the database is reachable, inspect pending migrations and the initial admin, deploy backend, verify /health and /api/auth/me, then release the paired frontend. A fresh database needs the original legacy schema restored before applying migrations. Do not execute seed.sql against production.

Roll back application commits together. Leave the additive RBAC columns and audit table in place. Never edit applied migrations or automatically restore a production database.
