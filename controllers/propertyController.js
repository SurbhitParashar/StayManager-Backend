const pool = require('../config/db');

exports.getProperties = async (req, res) => {
  const result = await pool.query(
    // 'SELECT property_id, property_name FROM properties WHERE is_active = TRUE'
    'SELECT * FROM properties'
  );
  console.log(result.rows);
  res.json(result.rows);
};