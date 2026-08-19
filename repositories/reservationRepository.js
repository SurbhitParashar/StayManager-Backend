const pool = require('../config/db');

const reservationListFields = `
  r.id,
  r.legacy_booking_id,
  r.guest_id,
  g.first_name,
  g.middle_initial,
  g.last_name,
  g.email::text AS email,
  g.phone,
  g.address_line1,
  g.address_line2,
  g.city,
  g.state,
  g.postal_code,
  g.country,
  r.property_id,
  p.property_name::text AS property_name,
  r.source,
  r.reservation_made_on,
  r.arrival_date,
  r.departure_date,
  r.adult_count,
  r.child_count,
  r.status,
  r.notes,
  r.credit_card_collected_offline,
  rf.rent_total,
  rf.cleaning_fee,
  rf.gate_fee,
  rf.pet_fee,
  rf.golf_cart_fee,
  rf.other_fee,
  rf.discount_amount,
  rf.adjustment_amount,
  rf.tax_amount,
  rf.guest_service_fee,
  rf.payment_processing_fee,
  rf.platform_fee,
  rf.taxes_paid_by_vrbo,
  rf.total_guest_payment,
  rf.amount_paid_to_vrbo,
  rf.subtotal_due_owner,
  rf.payout_to_owner,
  ra.status AS agreement_status,
  ra.sent_at AS agreement_sent_at,
  ra.received_at AS agreement_received_at,
  ra.notes AS agreement_notes,
  rv.received AS review_received,
  rv.rating AS review_rating,
  rv.review_text,
  rv.received_at AS review_received_at,
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'payment_number', rp.payment_number,
        'due_date', rp.due_date,
        'amount_due', rp.amount_due,
        'paid_date', rp.paid_date,
        'amount_paid', rp.amount_paid,
        'payment_method', rp.payment_method,
        'payment_status', rp.payment_status,
        'notes', rp.notes
      )
      ORDER BY rp.payment_number NULLS LAST, rp.due_date NULLS LAST, rp.created_at
    )
    FROM reservation_payments rp
    WHERE rp.reservation_id = r.id AND rp.deleted_at IS NULL
  ), '[]'::json) AS payments,
  r.created_at,
  r.updated_at
`;

exports.listReservations = async ({ propertyId, source, status, startDate, endDate, propertyName, month, search, limit = 25, offset = 0 }) => {
  const params = [];
  const where = ['r.deleted_at IS NULL'];

  if (propertyId) {
    params.push(propertyId);
    where.push(`r.property_id = $${params.length}`);
  }

  if (source) {
    params.push(source);
    where.push(`r.source = $${params.length}`);
  }

  if (propertyName) {
    params.push(`%${propertyName}%`);
    where.push(`p.property_name::text ILIKE $${params.length}`);
  }

  if (status) {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }

  if (startDate && endDate) {
    params.push(startDate, endDate);
    where.push(`r.arrival_date <= $${params.length} AND r.departure_date >= $${params.length - 1}`);
  }

  if (month) {
    params.push(`${month}-01`);
    where.push(`r.arrival_date < ($${params.length}::date + interval '1 month') AND r.departure_date >= $${params.length}::date`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`(
      g.first_name ILIKE $${params.length}
      OR g.last_name ILIKE $${params.length}
      OR g.email::text ILIKE $${params.length}
      OR g.phone ILIKE $${params.length}
    )`);
  }

  params.push(limit, offset);

  const result = await pool.query(
    `
      SELECT ${reservationListFields}
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      JOIN properties p ON p.property_id = r.property_id
      LEFT JOIN reservation_financials rf ON rf.reservation_id = r.id
      LEFT JOIN rental_agreements ra ON ra.reservation_id = r.id
      LEFT JOIN reviews rv ON rv.reservation_id = r.id
      WHERE ${where.join(' AND ')}
      ORDER BY r.arrival_date DESC, r.created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params
  );

  return result.rows;
};

exports.getReservationById = async (id) => {
  const reservation = await pool.query(
    `
      SELECT ${reservationListFields}
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      JOIN properties p ON p.property_id = r.property_id
      LEFT JOIN reservation_financials rf ON rf.reservation_id = r.id
      LEFT JOIN rental_agreements ra ON ra.reservation_id = r.id
      LEFT JOIN reviews rv ON rv.reservation_id = r.id
      WHERE r.id = $1 AND r.deleted_at IS NULL
    `,
    [id]
  );

  if (reservation.rows.length === 0) {
    return null;
  }

  const [financials, payments, agreement, review] = await Promise.all([
    pool.query('SELECT * FROM reservation_financials WHERE reservation_id = $1', [id]),
    pool.query('SELECT * FROM reservation_payments WHERE reservation_id = $1 AND deleted_at IS NULL ORDER BY payment_number NULLS LAST, due_date NULLS LAST, created_at', [id]),
    pool.query('SELECT * FROM rental_agreements WHERE reservation_id = $1', [id]),
    pool.query('SELECT * FROM reviews WHERE reservation_id = $1', [id]),
  ]);

  return {
    ...reservation.rows[0],
    financials: financials.rows[0] || null,
    payments: payments.rows,
    agreement: agreement.rows[0] || null,
    review: review.rows[0] || null,
  };
};

exports.createReservation = async (client, data) => {
  const result = await client.query(
    `
      INSERT INTO reservations (
        guest_id, property_id, source, reservation_made_on, arrival_date,
        departure_date, adult_count, child_count, status, notes,
        credit_card_collected_offline
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `,
    [
      data.guest_id,
      data.property_id,
      data.source,
      data.reservation_made_on || null,
      data.arrival_date,
      data.departure_date,
      data.adult_count,
      data.child_count,
      data.status,
      data.notes || null,
      data.credit_card_collected_offline,
    ]
  );

  return result.rows[0];
};

exports.updateReservation = async (client, id, data) => {
  const result = await client.query(
    `
      UPDATE reservations
      SET
        guest_id = $1,
        property_id = $2,
        source = $3,
        reservation_made_on = $4,
        arrival_date = $5,
        departure_date = $6,
        adult_count = $7,
        child_count = $8,
        status = $9,
        notes = $10,
        credit_card_collected_offline = $11
      WHERE id = $12 AND deleted_at IS NULL
      RETURNING *
    `,
    [
      data.guest_id,
      data.property_id,
      data.source,
      data.reservation_made_on || null,
      data.arrival_date,
      data.departure_date,
      data.adult_count,
      data.child_count,
      data.status,
      data.notes || null,
      data.credit_card_collected_offline,
      id,
    ]
  );

  return result.rows[0] || null;
};

exports.upsertFinancials = async (client, reservationId, financials = {}) => {
  const total = Number(financials.total_guest_payment ?? financials.rent_total ?? 0);

  const result = await client.query(
    `
      INSERT INTO reservation_financials (
        reservation_id, rent_total, cleaning_fee, gate_fee, pet_fee, golf_cart_fee,
        other_fee, discount_amount, adjustment_amount, tax_amount, guest_service_fee,
        payment_processing_fee, platform_fee, taxes_paid_by_vrbo, amount_paid_to_vrbo,
        total_guest_payment, subtotal_due_owner, payout_to_owner
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (reservation_id) DO UPDATE
      SET
        rent_total = EXCLUDED.rent_total,
        cleaning_fee = EXCLUDED.cleaning_fee,
        gate_fee = EXCLUDED.gate_fee,
        pet_fee = EXCLUDED.pet_fee,
        golf_cart_fee = EXCLUDED.golf_cart_fee,
        other_fee = EXCLUDED.other_fee,
        discount_amount = EXCLUDED.discount_amount,
        adjustment_amount = EXCLUDED.adjustment_amount,
        tax_amount = EXCLUDED.tax_amount,
        guest_service_fee = EXCLUDED.guest_service_fee,
        payment_processing_fee = EXCLUDED.payment_processing_fee,
        platform_fee = EXCLUDED.platform_fee,
        taxes_paid_by_vrbo = EXCLUDED.taxes_paid_by_vrbo,
        amount_paid_to_vrbo = EXCLUDED.amount_paid_to_vrbo,
        total_guest_payment = EXCLUDED.total_guest_payment,
        subtotal_due_owner = EXCLUDED.subtotal_due_owner,
        payout_to_owner = EXCLUDED.payout_to_owner
      RETURNING *
    `,
    [
      reservationId,
      financials.rent_total ?? total,
      financials.cleaning_fee ?? 0,
      financials.gate_fee ?? 0,
      financials.pet_fee ?? 0,
      financials.golf_cart_fee ?? 0,
      financials.other_fee ?? 0,
      financials.discount_amount ?? 0,
      financials.adjustment_amount ?? 0,
      financials.tax_amount ?? 0,
      financials.guest_service_fee ?? 0,
      financials.payment_processing_fee ?? 0,
      financials.platform_fee ?? 0,
      financials.taxes_paid_by_vrbo ?? 0,
      financials.amount_paid_to_vrbo ?? (
        Number(financials.taxes_paid_by_vrbo ?? 0) +
        Number(financials.guest_service_fee ?? 0) +
        Number(financials.payment_processing_fee ?? 0)
      ),
      financials.total_guest_payment ?? total,
      financials.subtotal_due_owner ?? total,
      financials.payout_to_owner ?? total,
    ]
  );

  return result.rows[0];
};

exports.replacePayments = async (client, reservationId, payments = []) => {
  await client.query(
    'UPDATE reservation_payments SET deleted_at = now() WHERE reservation_id = $1 AND deleted_at IS NULL',
    [reservationId]
  );

  const inserted = [];

  for (const payment of payments) {
    const result = await client.query(
      `
        INSERT INTO reservation_payments (
          reservation_id, payment_number, due_date, amount_due, paid_date,
          amount_paid, payment_method, payment_status, notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `,
      [
        reservationId,
        payment.payment_number || null,
        payment.due_date || null,
        payment.amount_due ?? 0,
        payment.paid_date || null,
        payment.amount_paid ?? 0,
        payment.payment_method || null,
        payment.payment_status || 'pending',
        payment.notes || null,
      ]
    );

    inserted.push(result.rows[0]);
  }

  return inserted;
};

exports.softDeleteReservation = async (id) => {
  const result = await pool.query(
    'UPDATE reservations SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [id]
  );

  return result.rowCount > 0;
};
