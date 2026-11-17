const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { z } = require('zod');

const accessSchema = z.object({ role: z.enum(['admin', 'manager', 'viewer']), is_active: z.boolean() }).strict();
const createSchema = z.object({
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(12).refine(value => Buffer.byteLength(value) <= 72, 'Password must be at most 72 bytes'),
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
}).strict();

exports.list = async (req, res) => {
  const { rows } = await pool.query('SELECT user_id, email, role, is_active FROM users ORDER BY user_id');
  res.json(rows);
};

exports.create = async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide a valid email, role, and password of 12–72 bytes' });
  const { email, password, role } = parsed.data;
  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Shared with access updates so a concurrently revoked admin cannot create accounts.
    await client.query('SELECT pg_advisory_xact_lock(71324592)');
    const actor = await client.query("SELECT 1 FROM users WHERE user_id = $1 AND role = 'admin' AND is_active = TRUE AND token_version = $2", [req.user.user_id, req.user.token_version]);
    if (!actor.rowCount) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Administrator access has changed. Please sign in again' });
    }
    const existing = await client.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This email is already registered' });
    }
    const { rows } = await client.query(
      'INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, $3, TRUE) RETURNING user_id, email, role, is_active',
      [email, hash, role]
    );
    await client.query('INSERT INTO user_access_audit (actor_id, target_id, action, new_access) VALUES ($1, $2, $3, $4)',
      [String(req.user.user_id), String(rows[0].user_id), 'create', JSON.stringify({ role, is_active: true })]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'This email is already registered' });
    throw err;
  } finally { client.release(); }
};

exports.updateAccess = async (req, res) => {
  const parsed = accessSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'A valid role and active status are required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(71324592)');
    const actor = await client.query("SELECT 1 FROM users WHERE user_id = $1 AND role = 'admin' AND is_active = TRUE AND token_version = $2", [req.user.user_id, req.user.token_version]);
    if (!actor.rowCount) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Administrator access has changed. Please sign in again' });
    }
    const { rows } = await client.query('SELECT user_id, role, is_active FROM users WHERE user_id = $1 FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    const current = rows[0];
    const access = parsed.data;
    if (current.role === 'admin' && current.is_active && (access.role !== 'admin' || !access.is_active)) {
      const admins = await client.query("SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND is_active = TRUE");
      if (admins.rows[0].count <= 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'At least one active administrator is required' });
      }
    }
    const updated = await client.query(
      'UPDATE users SET role = $1, is_active = $2, token_version = token_version + 1 WHERE user_id = $3 RETURNING user_id, email, role, is_active',
      [access.role, access.is_active, req.params.id]
    );
    await client.query('INSERT INTO user_access_audit (actor_id, target_id, action, old_access, new_access) VALUES ($1, $2, $3, $4, $5)',
      [String(req.user.user_id), String(current.user_id), 'update_access', JSON.stringify({ role: current.role, is_active: current.is_active }), JSON.stringify(access)]);
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};
