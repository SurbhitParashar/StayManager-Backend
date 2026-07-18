const pool = require('../config/db');
const bookingSchema = require('../validations/bookingSchema');
const reservationService = require('../services/reservationService');
const reservationRepository = require('../repositories/reservationRepository');

const parseValidationError = (err) => err.errors || err.issues;

const sourceFromPlatform = (platform) => {
  if (platform === 'vrbo' || platform === 'airbnb') return platform;
  return 'other';
};

const splitName = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || 'Guest',
    last_name: parts.slice(1).join(' ') || parts[0] || 'Guest',
  };
};

const legacyPayloadToReservation = (data) => {
  const guestName = splitName(data.name);

  return {
    guest: {
      ...guestName,
      email: data.email,
      phone: data.phone,
      country: 'USA',
    },
    property_id: data.property_id,
    source: sourceFromPlatform(data.platform),
    arrival_date: data.start_date,
    departure_date: data.end_date,
    status: data.status || 'booked',
    notes: data.notes || null,
    financials: {
      rent_total: data.total_amount,
      total_guest_payment: data.total_amount,
      subtotal_due_owner: data.total_amount,
      payout_to_owner: data.total_amount,
    },
    payments: [
      {
        payment_number: 1,
        amount_due: data.total_amount,
        amount_paid: data.total_amount,
        payment_method: data.payment_mode,
        payment_status: 'paid',
      },
    ],
  };
};

const getReservationIdFromLegacyId = async (id) => {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }

  const result = await pool.query(
    'SELECT reservation_id FROM legacy_booking_reservation_map WHERE legacy_booking_id = $1',
    [id]
  );

  return result.rows[0]?.reservation_id || null;
};

exports.createBooking = async (req, res) => {
  try {
    const validatedData = bookingSchema.parse({
      ...req.body,
      property_id: Number(req.body.property_id),
      total_amount: Number(req.body.total_amount),
    });

    const reservation = await reservationService.createReservation(legacyPayloadToReservation(validatedData));

    res.json({
      message: 'Booking created successfully',
      booking: reservation,
    });
  } catch (err) {
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    if (err.code === '23P01') {
      return res.status(409).json({ error: 'Booking overlaps an existing reservation for this property' });
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM booking_compat_view
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const reservationId = await getReservationIdFromLegacyId(req.params.id);

    if (!reservationId) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const deleted = await reservationRepository.softDeleteReservation(reservationId);

    if (!deleted) {
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
    const reservationId = await getReservationIdFromLegacyId(req.params.id);

    if (!reservationId) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const existing = await reservationRepository.getReservationById(reservationId);

    if (!existing) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const validatedData = bookingSchema.parse({
      ...req.body,
      property_id: Number(req.body.property_id),
      total_amount: Number(req.body.total_amount),
    });

    const payload = {
      ...legacyPayloadToReservation(validatedData),
      guest_id: existing.guest_id,
      guest: undefined,
    };

    const reservation = await reservationService.updateReservation(reservationId, payload);
    res.json(reservation);
  } catch (err) {
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    if (err.code === '23P01') {
      return res.status(409).json({ error: 'Booking overlaps an existing reservation for this property' });
    }

    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const reservationId = await getReservationIdFromLegacyId(req.params.id);

    if (!reservationId) {
      return res.status(404).json({ message: 'Not found' });
    }

    const result = await pool.query(
      `
        SELECT *
        FROM booking_compat_view
        WHERE reservation_id = $1
      `,
      [reservationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching booking' });
  }
};
