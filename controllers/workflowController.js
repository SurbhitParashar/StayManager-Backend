const pool = require('../config/db');

exports.listEvents = async (req, res) => {
  try {
    const params = [];
    const where = ['pe.deleted_at IS NULL'];

    if (req.query.property_id) {
      params.push(req.query.property_id);
      where.push(`pe.property_id = $${params.length}`);
    }

    if (req.query.start_date && req.query.end_date) {
      params.push(req.query.start_date, req.query.end_date);
      where.push(`pe.start_date <= $${params.length} AND pe.end_date >= $${params.length - 1}`);
    }

    const result = await pool.query(
      `
        SELECT pe.*, p.property_name::text AS property_name
        FROM property_events pe
        JOIN properties p ON p.property_id = pe.property_id
        WHERE ${where.join(' AND ')}
        ORDER BY pe.start_date, pe.end_date
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load property events' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const result = await pool.query(
      `
        INSERT INTO property_events (property_id, event_type, title, start_date, end_date, notes)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      [
        req.body.property_id,
        req.body.event_type || 'other',
        req.body.title,
        req.body.start_date,
        req.body.end_date,
        req.body.notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create property event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE property_events SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Property event not found' });
    }

    res.json({ message: 'Property event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete property event' });
  }
};

exports.updateAgreement = async (req, res) => {
  try {
    const result = await pool.query(
      `
        INSERT INTO rental_agreements (reservation_id, sent_at, received_at, status, notes)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (reservation_id) DO UPDATE
        SET sent_at = EXCLUDED.sent_at,
            received_at = EXCLUDED.received_at,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes
        RETURNING *
      `,
      [
        req.params.id,
        req.body.sent_at || null,
        req.body.received_at || null,
        req.body.status || 'not_sent',
        req.body.notes || null,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update agreement' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const result = await pool.query(
      `
        INSERT INTO reviews (reservation_id, received, rating, review_text, received_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (reservation_id) DO UPDATE
        SET received = EXCLUDED.received,
            rating = EXCLUDED.rating,
            review_text = EXCLUDED.review_text,
            received_at = EXCLUDED.received_at
        RETURNING *
      `,
      [
        req.params.id,
        Boolean(req.body.received),
        req.body.rating || null,
        req.body.review_text || null,
        req.body.received_at || null,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update review' });
  }
};

exports.listContacts = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM contacts
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR contact_type = $1)
        ORDER BY name
      `,
      [req.query.contact_type || null]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load contacts' });
  }
};

exports.createContact = async (req, res) => {
  try {
    const result = await pool.query(
      `
        INSERT INTO contacts (contact_type, name, email, phone, company, notes)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      [
        req.body.contact_type || 'other',
        req.body.name,
        req.body.email || null,
        req.body.phone || null,
        req.body.company || null,
        req.body.notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create contact' });
  }
};

exports.linkPropertyContact = async (req, res) => {
  try {
    const result = await pool.query(
      `
        INSERT INTO property_contacts (property_id, contact_id, role)
        VALUES ($1,$2,$3)
        ON CONFLICT (property_id, contact_id, role) DO NOTHING
        RETURNING *
      `,
      [req.params.propertyId, req.body.contact_id, req.body.role]
    );

    res.status(201).json(result.rows[0] || { message: 'Contact already linked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to link property contact' });
  }
};
