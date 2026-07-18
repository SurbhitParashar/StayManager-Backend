# Database Migrations

Active SQL migrations live in `backend/db/migrations`.

Migration files must use this naming format:

```text
YYYYMMDDHHMMSS_description.sql
```

The migration runner records applied migrations in `public.schema_migrations`.
It uses a PostgreSQL advisory lock so two migration runs cannot apply at the
same time.

Commands:

```bash
npm run db:migrate:status
npm run db:migrate:dry-run
npm run db:migrate
```

Production execution order:

1. Create and verify a Supabase backup.
2. Run `npm run db:migrate:dry-run`.
3. Run `npm run db:migrate`.
4. Run `npm run db:migrate:status`.

The baseline migration is intentionally a no-op. It establishes migration
tracking without creating business tables or changing existing production data.

Only `backend/db/migrations` is active. The older `backend/migrations` folder is
not used by this migration runner.
