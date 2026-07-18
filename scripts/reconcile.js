const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const result = await client.query(`
      SELECT
        (SELECT count(*)::int FROM customers) AS customers,
        (SELECT count(*)::int FROM guests) AS guests,
        (SELECT count(*)::int FROM bookings) AS bookings,
        (SELECT count(*)::int FROM reservations WHERE deleted_at IS NULL) AS reservations,
        (SELECT coalesce(sum(total_amount),0)::numeric(14,2) FROM bookings) AS old_total,
        (SELECT coalesce(sum(total_guest_payment),0)::numeric(14,2) FROM reservation_financials) AS new_total,
        (SELECT count(*)::int FROM bookings b LEFT JOIN legacy_booking_reservation_map m ON m.legacy_booking_id=b.booking_id WHERE m.reservation_id IS NULL) AS unmapped_bookings,
        (SELECT count(*)::int FROM customers c LEFT JOIN legacy_customer_guest_map m ON m.legacy_customer_id=c.customer_id WHERE m.guest_id IS NULL) AS unmapped_customers
    `);
    await client.query('ROLLBACK');
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
