const pool = require('../config/db');
const bookingSchema =require('../validations/bookingSchema');


exports.createBooking = async (req, res) => {
  const client = await pool.connect();

  try {
  const validatedData = bookingSchema.parse({
      ...req.body,
      property_id: Number(req.body.property_id),
      total_amount: Number(req.body.total_amount)
    });

    
    const {
      name,
      email,
      phone,
      property_id,
      platform,
      start_date,
      end_date,
      total_amount,
      payment_mode,
      status
    } = validatedData;

    await client.query('BEGIN');

    // 1. Insert or get customer
    let customer = await client.query(
      'SELECT customer_id FROM customers WHERE email = $1',
      [email]
    );

    let customer_id;

    if (customer.rows.length === 0) {
      const newCustomer = await client.query(
        `INSERT INTO customers (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING customer_id`,
        [name, email, phone]
      );

      customer_id = newCustomer.rows[0].customer_id;
    } else {
      customer_id = customer.rows[0].customer_id;
    }

    // 2. Insert booking
    const booking = await client.query(
      `INSERT INTO bookings 
      (customer_id, property_id, platform, start_date, end_date, total_amount, payment_mode, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        customer_id,
        property_id,
        platform,
        start_date,
        end_date,
        total_amount,
        payment_mode,
        status || 'booked'
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Booking created successfully',
      booking: booking.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.errors) {
      return res.status(400).json({
        error: err.errors[0].message
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });

  } finally {
    client.release();
  }
};



exports.getAllBookings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.booking_id,
        c.name,
        c.email,
        c.phone,
        p.property_name,
        b.platform,
        b.start_date,
        b.end_date,
        b.total_amount,
        b.payment_mode,
        b.status
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN properties p ON b.property_id = p.property_id
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};


// delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM bookings WHERE booking_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting booking' });
  }
};



exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      property_id,
      platform,
      start_date,
      end_date,
      total_amount,
      payment_mode,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE bookings
       SET property_id=$1, platform=$2, start_date=$3, end_date=$4,
           total_amount=$5, payment_mode=$6, status=$7
       WHERE booking_id=$8
       RETURNING *`,
      [
        property_id,
        platform,
        start_date,
        end_date,
        total_amount,
        payment_mode,
        status,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};



exports.getBookingById = async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(`
    SELECT 
      b.*, 
      c.name, c.email, c.phone
    FROM bookings b
    JOIN customers c ON b.customer_id = c.customer_id
    WHERE b.booking_id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Not found' });
  }

  res.json(result.rows[0]);
};