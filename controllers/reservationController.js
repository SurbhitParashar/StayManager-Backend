const reservationRepository = require('../repositories/reservationRepository');
const reservationService = require('../services/reservationService');
const { reservationSchema, financialSchema, paymentSchema } = require('../validations/reservationSchema');
const pool = require('../config/db');

const parseValidationError = (err) => err.errors || err.issues;

exports.listReservations = async (req, res) => {
  try {
    const reservations = await reservationRepository.listReservations({
      propertyId: req.query.property_id,
      source: req.query.source,
      status: req.query.status,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      search: req.query.search,
      limit: Math.min(Number(req.query.limit) || 25, 100),
      offset: Number(req.query.offset) || 0,
    });

    res.json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load reservations' });
  }
};

exports.getReservation = async (req, res) => {
  try {
    const reservation = await reservationRepository.getReservationById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load reservation' });
  }
};

exports.createReservation = async (req, res) => {
  try {
    const data = reservationSchema.parse(req.body);
    const reservation = await reservationService.createReservation(data);
    res.status(201).json(reservation);
  } catch (err) {
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    if (err.code === '23P01') {
      return res.status(409).json({ error: 'Reservation overlaps an existing booking for this property' });
    }

    console.error(err);
    res.status(500).json({ message: 'Failed to create reservation' });
  }
};

exports.updateReservation = async (req, res) => {
  try {
    const data = reservationSchema.parse(req.body);
    const reservation = await reservationService.updateReservation(req.params.id, data);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (err) {
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    if (err.code === '23P01') {
      return res.status(409).json({ error: 'Reservation overlaps an existing booking for this property' });
    }

    console.error(err);
    res.status(500).json({ message: 'Failed to update reservation' });
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const deleted = await reservationRepository.softDeleteReservation(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json({ message: 'Reservation deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete reservation' });
  }
};

exports.updateFinancials = async (req, res) => {
  const client = await pool.connect();

  try {
    const data = financialSchema.parse(req.body);
    await client.query('BEGIN');
    const financials = await reservationRepository.upsertFinancials(client, req.params.id, data);
    await client.query('COMMIT');
    res.json(financials);
  } catch (err) {
    await client.query('ROLLBACK');
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    console.error(err);
    res.status(500).json({ message: 'Failed to update financials' });
  } finally {
    client.release();
  }
};

exports.replacePayments = async (req, res) => {
  const client = await pool.connect();

  try {
    const payments = paymentSchema.array().parse(req.body.payments || req.body);
    await client.query('BEGIN');
    const rows = await reservationRepository.replacePayments(client, req.params.id, payments);
    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    console.error(err);
    res.status(500).json({ message: 'Failed to update payments' });
  } finally {
    client.release();
  }
};
