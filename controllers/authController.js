const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { permissionsFor } = require('../config/permissions');
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  path: '/',
});
const publicUser = (user) => ({ user_id: user.user_id, email: user.email, role: user.role, permissions: permissionsFor(user.role) });
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: 'A valid email and password are required' });
  }
  const { rows } = await pool.query(
    'SELECT user_id, email, password_hash, role, token_version FROM users WHERE lower(email) = lower($1) AND is_active = TRUE',
    [email.trim()]
  );
  const user = rows[0];
  if (!user || !await bcrypt.compare(password, user.password_hash) || !permissionsFor(user.role).length) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ user_id: user.user_id, token_version: user.token_version }, process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1d' });
  res.cookie('token', token, { ...cookieOptions(), maxAge: 86400000 });
  res.set('Cache-Control', 'no-store');
  res.json({ message: 'Login successful', user: publicUser(user) });
};
exports.me = (req, res) => res.json({ user: publicUser(req.user) });
exports.logout = async (req, res) => {
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE user_id = $1', [req.user.user_id]);
  res.clearCookie('token', cookieOptions());
  res.json({ message: 'Signed out from all sessions' });
};
