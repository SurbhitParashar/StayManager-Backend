const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  );
  if (user.rows.length === 0) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.rows[0].password_hash);

  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { user_id: user.rows[0].user_id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );


  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: "None"
  });

  res.json({ message: 'Login successful' });
};