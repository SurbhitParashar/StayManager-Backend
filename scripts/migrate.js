const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const MIGRATION_TABLE = 'schema_migrations';
const LOCK_KEY = 71324591;

const command = process.argv[2] || 'status';
const validCommands = new Set(['status', 'dry-run', 'up']);

if (!validCommands.has(command)) {
  console.error(`Unknown migration command: ${command}`);
  console.error('Use one of: status, dry-run, up');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function checksum(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function readMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migration directory not found: ${MIGRATIONS_DIR}`);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))
    .sort()
    .map((file) => {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, 'utf8');

      return {
        id: file.slice(0, 14),
        name: file,
        sql,
        checksum: checksum(sql),
      };
    });
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.${MIGRATION_TABLE} (
      id text PRIMARY KEY,
      name text NOT NULL UNIQUE,
      checksum text NOT NULL,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const exists = await client.query("SELECT to_regclass('public.schema_migrations') AS table_name");

  if (!exists.rows[0].table_name) {
    return new Map();
  }

  const result = await client.query(`
    SELECT id, name, checksum, executed_at
    FROM public.${MIGRATION_TABLE}
    ORDER BY id
  `);

  return new Map(result.rows.map((row) => [row.name, row]));
}

async function status() {
  const migrations = readMigrations();
  const client = await pool.connect();

  try {
    await client.query('BEGIN READ ONLY');
    const applied = await getAppliedMigrations(client);
    await client.query('ROLLBACK');

    console.log(`Migration directory: ${MIGRATIONS_DIR}`);
    console.log(`Found ${migrations.length} migration file(s).`);

    for (const migration of migrations) {
      const appliedMigration = applied.get(migration.name);

      if (!appliedMigration) {
        console.log(`PENDING  ${migration.name}`);
        continue;
      }

      const state = appliedMigration.checksum === migration.checksum ? 'APPLIED ' : 'CHANGED ';
      console.log(`${state} ${migration.name}`);
    }
  } finally {
    client.release();
  }
}

async function dryRun() {
  const migrations = readMigrations();
  const client = await pool.connect();

  try {
    await client.query('BEGIN READ ONLY');
    const applied = await getAppliedMigrations(client);
    await client.query('ROLLBACK');

    const pending = migrations.filter((migration) => !applied.has(migration.name));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log('Pending migrations:');
    for (const migration of pending) {
      console.log(`- ${migration.name}`);
    }
  } finally {
    client.release();
  }
}

async function up() {
  const migrations = readMigrations();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
    await ensureMigrationTable(client);

    const applied = await getAppliedMigrations(client);
    const pending = migrations.filter((migration) => !applied.has(migration.name));

    for (const migration of migrations) {
      const appliedMigration = applied.get(migration.name);

      if (appliedMigration && appliedMigration.checksum !== migration.checksum) {
        throw new Error(`Applied migration checksum changed: ${migration.name}`);
      }
    }

    if (pending.length === 0) {
      console.log('No pending migrations.');
      await client.query('COMMIT');
      return;
    }

    for (const migration of pending) {
      console.log(`Applying ${migration.name}`);
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO public.${MIGRATION_TABLE} (id, name, checksum) VALUES ($1, $2, $3)`,
        [migration.id, migration.name, migration.checksum]
      );
    }

    await client.query('COMMIT');
    console.log(`Applied ${pending.length} migration(s).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

(async () => {
  try {
    if (command === 'status') await status();
    if (command === 'dry-run') await dryRun();
    if (command === 'up') await up();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
