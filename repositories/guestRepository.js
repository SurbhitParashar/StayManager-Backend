const pool = require('../config/db');

const guestFields = `
  id,
  legacy_customer_id,
  first_name,
  middle_initial,
  last_name,
  email::text AS email,
  phone,
  address_line1,
  address_line2,
  city,
  state,
  postal_code,
  country,
  created_at,
  updated_at,
  deleted_at
`;

exports.listGuests = async ({ search = '', limit = 25, offset = 0 }) => {
  const params = [];
  let where = 'deleted_at IS NULL';

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (
      first_name ILIKE $${params.length}
      OR last_name ILIKE $${params.length}
      OR email::text ILIKE $${params.length}
      OR phone ILIKE $${params.length}
    )`;
  }

  params.push(limit, offset);

  const result = await pool.query(
    `
      SELECT ${guestFields}
      FROM guests
      WHERE ${where}
      ORDER BY last_name, first_name
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params
  );

  return result.rows;
};

exports.getGuestById = async (id) => {
  const result = await pool.query(
    `SELECT ${guestFields} FROM guests WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  return result.rows[0] || null;
};

exports.createGuest = async (client, data) => {
  const db = client || pool;
  const result = await db.query(
    `
      INSERT INTO guests (
        first_name, middle_initial, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING ${guestFields}
    `,
    [
      data.first_name,
      data.middle_initial || null,
      data.last_name,
      data.email || null,
      data.phone || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.city || null,
      data.state || null,
      data.postal_code || null,
      data.country || 'USA',
    ]
  );

  return result.rows[0];
};

exports.updateGuest = async (id, data) => {
  const result = await pool.query(
    `
      UPDATE guests
      SET
        first_name = $1,
        middle_initial = $2,
        last_name = $3,
        email = $4,
        phone = $5,
        address_line1 = $6,
        address_line2 = $7,
        city = $8,
        state = $9,
        postal_code = $10,
        country = $11
      WHERE id = $12 AND deleted_at IS NULL
      RETURNING ${guestFields}
    `,
    [
      data.first_name,
      data.middle_initial || null,
      data.last_name,
      data.email || null,
      data.phone || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.city || null,
      data.state || null,
      data.postal_code || null,
      data.country || 'USA',
      id,
    ]
  );

  return result.rows[0] || null;
};

exports.updateGuestWithClient = async (client, id, data) => {
  const result = await client.query(
    `
      UPDATE guests
      SET
        first_name = $1,
        middle_initial = $2,
        last_name = $3,
        email = $4,
        phone = $5,
        address_line1 = $6,
        address_line2 = $7,
        city = $8,
        state = $9,
        postal_code = $10,
        country = $11
      WHERE id = $12 AND deleted_at IS NULL
      RETURNING ${guestFields}
    `,
    [
      data.first_name,
      data.middle_initial || null,
      data.last_name,
      data.email || null,
      data.phone || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.city || null,
      data.state || null,
      data.postal_code || null,
      data.country || 'USA',
      id,
    ]
  );

  return result.rows[0] || null;
};

exports.softDeleteGuest = async (id) => {
  const result = await pool.query(
    `
      UPDATE guests
      SET deleted_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `,
    [id]
  );

  return result.rowCount > 0;
};
