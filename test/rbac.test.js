const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.CORS_ORIGINS = 'http://localhost:3000';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { permissionsFor } = require('../config/permissions');

let currentUser = { user_id: 1, email: 'admin@example.com', role: 'admin', token_version: 0 };
let queries = [];
let server;
let base;
let passwordHash;
const realQuery = pool.query;
const realConnect = pool.connect;

before(async () => {
  passwordHash = await bcrypt.hash('valid-password-123', 4);
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('FROM users')) return { rows: currentUser ? [{ ...currentUser, password_hash: passwordHash }] : [], rowCount: currentUser ? 1 : 0 };
    if (sql.startsWith('UPDATE users')) { currentUser.token_version++; return { rows: [], rowCount: 1 }; }
    throw new Error('Unexpected business query: ' + sql);
  };
  server = require('../app').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  pool.query = realQuery;
  pool.connect = realConnect;
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

const token = (version = 0) => jwt.sign({ user_id: 1, token_version: version }, process.env.JWT_SECRET);
const request = (path, method = 'GET', body, session = token(), origin = 'http://localhost:3000') => fetch(base + path, {
  method,
  headers: { ...(session ? { Cookie: `token=${session}` } : {}), ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json' },
  ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
});

test('role matrix grants only intended permissions and rejects unknown roles', () => {
  assert.deepEqual(permissionsFor('viewer'), ['data.read', 'reports.read']);
  assert(!permissionsFor('manager').includes('data.delete'));
  assert(!permissionsFor('manager').includes('users.manage'));
  assert(permissionsFor('admin').includes('users.manage'));
  assert.deepEqual(permissionsFor('owner'), []);
  assert.deepEqual(permissionsFor('constructor'), []);
});

test('all business routes reject anonymous requests, including properties and legacy bookings', async () => {
  for (const path of ['/api/properties', '/api/booking', '/api/guests', '/api/reservations', '/api/reports/kpis', '/api/property-events', '/api/contacts', '/api/users']) {
    assert.equal((await request(path, 'GET', null, null)).status, 401, path);
  }
});

test('viewer cannot mutate any business endpoint or manage users', async () => {
  currentUser.role = 'viewer';
  const routes = [
    ['POST', '/api/booking'], ['PUT', '/api/booking/1'], ['DELETE', '/api/booking/1'],
    ['POST', '/api/guests'], ['PUT', '/api/guests/1'], ['DELETE', '/api/guests/1'],
    ['POST', '/api/reservations'], ['PUT', '/api/reservations/1'], ['DELETE', '/api/reservations/1'],
    ['PUT', '/api/reservations/1/financials'], ['PUT', '/api/reservations/1/payments'],
    ['POST', '/api/property-events'], ['DELETE', '/api/property-events/1'],
    ['PUT', '/api/reservations/1/agreement'], ['PUT', '/api/reservations/1/review'],
    ['POST', '/api/contacts'], ['POST', '/api/properties/1/contacts'],
    ['GET', '/api/users'], ['POST', '/api/users'], ['PATCH', '/api/users/1/access'],
  ];
  for (const [method, path] of routes) assert.equal((await request(path, method, {})).status, 403, `${method} ${path}`);
});

test('manager cannot delete records or administer users', async () => {
  currentUser.role = 'manager';
  for (const path of ['/api/booking/1', '/api/guests/1', '/api/reservations/1', '/api/property-events/1']) {
    assert.equal((await request(path, 'DELETE')).status, 403, path);
  }
  assert.equal((await request('/api/users')).status, 403);
  const { user } = await (await request('/api/auth/me')).json();
  assert(user.permissions.includes('data.write'));
  assert(!('token_version' in user));
});

test('database role changes are reflected on the very next request', async () => {
  currentUser.role = 'admin';
  assert.equal((await request('/api/users')).status, 200);
  currentUser.role = 'viewer';
  assert.equal((await request('/api/users')).status, 403);
});

test('revoked, deactivated, expired, tampered, and legacy sessions are rejected', async () => {
  currentUser.token_version = 2;
  assert.equal((await request('/api/auth/me')).status, 401);
  currentUser.token_version = 0;
  const legacy = jwt.sign({ user_id: 1 }, process.env.JWT_SECRET);
  const expired = jwt.sign({ user_id: 1, token_version: 0 }, process.env.JWT_SECRET, { expiresIn: -1 });
  for (const session of [legacy, expired, 'tampered']) assert.equal((await request('/api/auth/me', 'GET', null, session)).status, 401);
  const saved = currentUser;
  currentUser = null;
  assert.equal((await request('/api/auth/me')).status, 401);
  currentUser = saved;
});

test('writes reject missing or untrusted origins', async () => {
  assert.equal((await request('/api/auth/login', 'POST', {}, null, null)).status, 403);
  assert.equal((await request('/api/auth/login', 'POST', {}, null, 'https://evil.example')).status, 403);
});

test('login validates credentials and sets an HttpOnly cookie; logout revokes it', async () => {
  currentUser.role = 'admin';
  assert.equal((await request('/api/auth/login', 'POST', {}, null)).status, 400);
  assert.equal((await request('/api/auth/login', 'POST', { email: currentUser.email, password: 'wrong' }, null)).status, 401);
  const response = await request('/api/auth/login', 'POST', { email: currentUser.email, password: 'valid-password-123' }, null);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal((await response.json()).user.role, 'admin');
  const session = token();
  assert.equal((await request('/api/auth/logout', 'POST', {}, session)).status, 200);
  assert.equal((await request('/api/auth/me', 'GET', null, session)).status, 401);
  currentUser.token_version = 0;
});

test('last active admin cannot be removed and transaction rolls back', async () => {
  const calls = [];
  pool.connect = async () => ({
    query: async (sql) => {
      calls.push(sql);
      if (sql.includes('count(*)')) return { rows: [{ count: 1 }] };
      if (sql.includes('FOR UPDATE')) return { rows: [{ user_id: 1, role: 'admin', is_active: true }] };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });
  const response = await request('/api/users/1/access', 'PATCH', { role: 'viewer', is_active: true });
  assert.equal(response.status, 409);
  assert(calls.includes('ROLLBACK'));
  assert(!calls.some(sql => sql.startsWith('UPDATE users')));
});

test('database failure fails closed without exposing SQL or secrets', async () => {
  const saved = pool.query;
  pool.query = async () => { throw new Error('private database credential'); };
  const response = await request('/api/auth/me');
  assert.equal(response.status, 500);
  assert(!JSON.stringify(await response.json()).includes('credential'));
  pool.query = saved;
});

test('admin account creation hashes passwords and records an audit entry', async () => {
  currentUser.role = 'admin';
  const calls = [];
  pool.connect = async () => ({
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('lower(email)')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('INSERT INTO users')) return { rows: [{ user_id: 2, email: params[0], role: params[2], is_active: true }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });
  const response = await request('/api/users', 'POST', { email: 'new@example.com', password: 'new-password-123', role: 'viewer' });
  assert.equal(response.status, 201);
  const account = await response.json();
  assert(!('password_hash' in account));
  const insert = calls.find(call => call.sql.startsWith('INSERT INTO users'));
  assert(await bcrypt.compare('new-password-123', insert.params[1]));
  assert(calls.some(call => call.sql.startsWith('INSERT INTO user_access_audit')));
  assert(calls.some(call => call.sql === 'COMMIT'));
});

test('access updates revoke sessions and record an audit entry atomically', async () => {
  const calls = [];
  pool.connect = async () => ({
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('FOR UPDATE')) return { rows: [{ user_id: 2, role: 'viewer', is_active: true }] };
      if (sql.startsWith('UPDATE users')) return { rows: [{ user_id: 2, email: 'new@example.com', role: 'manager', is_active: true }] };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });
  const response = await request('/api/users/2/access', 'PATCH', { role: 'manager', is_active: true });
  assert.equal(response.status, 200);
  assert(calls.some(call => call.sql.includes('token_version = token_version + 1')));
  assert(calls.some(call => call.sql.startsWith('INSERT INTO user_access_audit')));
  assert(calls.some(call => call.sql === 'COMMIT'));
  assert.equal((await request('/api/users/2/access', 'PATCH', { role: 'superadmin', is_active: true })).status, 400);
});

test('login attempts are rate limited with a retry interval', () => {
  const limiter = require('../middleware/loginLimiter');
  let status;
  let retry;
  let allowed = 0;
  const res = {
    set(name, value) { retry = value; },
    status(value) { status = value; return this; },
    json() {},
  };
  for (let i = 0; i < 31; i++) limiter({ ip: 'rate-test' }, res, () => allowed++);
  assert.equal(allowed, 30);
  assert.equal(status, 429);
  assert(Number(retry) > 0);
});
