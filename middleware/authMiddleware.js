const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { permissionsFor } = require('../config/permissions');
module.exports = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
  if (!decoded.user_id || !Number.isInteger(decoded.token_version)) {
    return res.status(401).json({ message: 'Please sign in again' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT user_id, email, role, token_version FROM users WHERE user_id = $1 AND is_active = TRUE',
      [decoded.user_id]
    );
    const user = rows[0];
    if (!user || user.token_version !== decoded.token_version || !permissionsFor(user.role).length) {
      return res.status(401).json({ message: 'Session revoked. Please sign in again' });
    }
    req.user = user;
    next();
  } catch (err) { next(err); }
};
