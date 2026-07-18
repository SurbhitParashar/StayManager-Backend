const pool = require('../config/db');
const guestRepository = require('../repositories/guestRepository');
const reservationRepository = require('../repositories/reservationRepository');

exports.createReservation = async (data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let guestId = data.guest_id;

    if (!guestId && data.guest) {
      const guest = await guestRepository.createGuest(client, data.guest);
      guestId = guest.id;
    } else if (guestId && data.guest) {
      await guestRepository.updateGuestWithClient(client, guestId, data.guest);
    }

    const reservation = await reservationRepository.createReservation(client, {
      ...data,
      guest_id: guestId,
    });

    await reservationRepository.upsertFinancials(client, reservation.id, data.financials);
    await reservationRepository.replacePayments(client, reservation.id, data.payments || []);

    await client.query(
      `
        INSERT INTO rental_agreements (reservation_id, sent_at, received_at, status)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (reservation_id) DO UPDATE
        SET sent_at = EXCLUDED.sent_at,
            received_at = EXCLUDED.received_at,
            status = EXCLUDED.status
      `,
      [
        reservation.id,
        data.agreement?.sent_at || null,
        data.agreement?.received_at || null,
        data.agreement?.received ? 'received' : data.agreement?.sent ? 'sent' : 'not_sent',
      ]
    );

    await client.query(
      `
        INSERT INTO reviews (reservation_id, received, rating)
        VALUES ($1,$2,$3)
        ON CONFLICT (reservation_id) DO UPDATE
        SET received = EXCLUDED.received,
            rating = EXCLUDED.rating
      `,
      [reservation.id, Boolean(data.review?.received), data.review?.rating || null]
    );

    await client.query(
      `
        INSERT INTO property_events (
          property_id, reservation_id, event_type, title, start_date, end_date, notes
        )
        VALUES ($1,$2,'reservation','Reservation',$3,$4,$5)
        ON CONFLICT DO NOTHING
      `,
      [reservation.property_id, reservation.id, reservation.arrival_date, reservation.departure_date, reservation.notes || null]
    );

    await client.query('COMMIT');

    return reservationRepository.getReservationById(reservation.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.updateReservation = async (id, data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let guestId = data.guest_id;

    if (!guestId && data.guest) {
      const guest = await guestRepository.createGuest(client, data.guest);
      guestId = guest.id;
    } else if (guestId && data.guest) {
      await guestRepository.updateGuestWithClient(client, guestId, data.guest);
    }

    const reservation = await reservationRepository.updateReservation(client, id, {
      ...data,
      guest_id: guestId,
    });

    if (!reservation) {
      await client.query('ROLLBACK');
      return null;
    }

    await reservationRepository.upsertFinancials(client, reservation.id, data.financials);

    if (Array.isArray(data.payments)) {
      await reservationRepository.replacePayments(client, reservation.id, data.payments);
    }

    await client.query(
      `
        INSERT INTO rental_agreements (reservation_id, sent_at, received_at, status)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (reservation_id) DO UPDATE
        SET sent_at = EXCLUDED.sent_at,
            received_at = EXCLUDED.received_at,
            status = EXCLUDED.status
      `,
      [
        reservation.id,
        data.agreement?.sent_at || null,
        data.agreement?.received_at || null,
        data.agreement?.received ? 'received' : data.agreement?.sent ? 'sent' : 'not_sent',
      ]
    );

    await client.query(
      `
        INSERT INTO reviews (reservation_id, received, rating)
        VALUES ($1,$2,$3)
        ON CONFLICT (reservation_id) DO UPDATE
        SET received = EXCLUDED.received,
            rating = EXCLUDED.rating
      `,
      [reservation.id, Boolean(data.review?.received), data.review?.rating || null]
    );

    await client.query(
      `
        UPDATE property_events
        SET property_id = $1, start_date = $2, end_date = $3, notes = $4
        WHERE reservation_id = $5 AND event_type = 'reservation'
      `,
      [reservation.property_id, reservation.arrival_date, reservation.departure_date, reservation.notes || null, reservation.id]
    );

    await client.query('COMMIT');

    return reservationRepository.getReservationById(reservation.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
