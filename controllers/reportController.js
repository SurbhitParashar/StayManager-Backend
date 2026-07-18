const pool = require('../config/db');

const buildFilters = (query) => {
  const params = [];
  const where = ['r.deleted_at IS NULL'];

  if (query.property_id) {
    params.push(query.property_id);
    where.push(`r.property_id = $${params.length}`);
  }

  if (query.source) {
    params.push(query.source);
    where.push(`r.source = $${params.length}`);
  }

  if (query.status) {
    params.push(query.status);
    where.push(`r.status = $${params.length}`);
  }

  if (query.start_date) {
    params.push(query.start_date);
    where.push(`r.arrival_date >= $${params.length}`);
  }

  if (query.end_date) {
    params.push(query.end_date);
    where.push(`r.arrival_date <= $${params.length}`);
  }

  return { params, where: where.join(' AND ') };
};

exports.kpis = async (req, res) => {
  try {
    const { params, where } = buildFilters(req.query);
    const result = await pool.query(
      `
        SELECT
          count(*)::int AS total_reservations,
          coalesce(sum(rf.total_guest_payment), 0)::numeric(14,2) AS total_revenue,
          coalesce(avg(rf.total_guest_payment), 0)::numeric(14,2) AS average_reservation_value,
          coalesce(sum(rf.payout_to_owner), 0)::numeric(14,2) AS total_owner_payout
        FROM reservations r
        LEFT JOIN reservation_financials rf ON rf.reservation_id = r.id
        WHERE ${where}
      `,
      params
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load KPI report' });
  }
};

exports.revenue = async (req, res) => {
  try {
    const { params, where } = buildFilters(req.query);
    const result = await pool.query(
      `
        SELECT
          to_char(date_trunc('month', r.arrival_date), 'YYYY-MM') AS month,
          coalesce(sum(rf.total_guest_payment), 0)::numeric(14,2) AS revenue,
          count(*)::int AS reservations
        FROM reservations r
        LEFT JOIN reservation_financials rf ON rf.reservation_id = r.id
        WHERE ${where}
        GROUP BY date_trunc('month', r.arrival_date)
        ORDER BY date_trunc('month', r.arrival_date)
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load revenue report' });
  }
};

exports.propertyPerformance = async (req, res) => {
  try {
    const { params, where } = buildFilters(req.query);
    const result = await pool.query(
      `
        SELECT
          p.property_id,
          p.property_name::text AS property_name,
          count(r.id)::int AS reservations,
          coalesce(sum(rf.total_guest_payment), 0)::numeric(14,2) AS revenue,
          coalesce(sum(rf.payout_to_owner), 0)::numeric(14,2) AS owner_payout
        FROM properties p
        LEFT JOIN reservations r ON r.property_id = p.property_id AND ${where}
        LEFT JOIN reservation_financials rf ON rf.reservation_id = r.id
        GROUP BY p.property_id, p.property_name
        ORDER BY revenue DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load property report' });
  }
};

exports.sourceBreakdown = async (req, res) => {
  try {
    const { params, where } = buildFilters(req.query);
    const result = await pool.query(
      `
        SELECT
          r.source,
          count(*)::int AS reservations,
          coalesce(sum(rf.total_guest_payment), 0)::numeric(14,2) AS revenue
        FROM reservations r
        LEFT JOIN reservation_financials rf ON rf.reservation_id = r.id
        WHERE ${where}
        GROUP BY r.source
        ORDER BY reservations DESC, r.source
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load source report' });
  }
};

exports.payments = async (req, res) => {
  try {
    const params = [];
    const where = ['rp.deleted_at IS NULL'];

    if (req.query.status) {
      params.push(req.query.status);
      where.push(`rp.payment_status = $${params.length}`);
    }

    if (req.query.start_date) {
      params.push(req.query.start_date);
      where.push(`rp.due_date >= $${params.length}`);
    }

    if (req.query.end_date) {
      params.push(req.query.end_date);
      where.push(`rp.due_date <= $${params.length}`);
    }

    const result = await pool.query(
      `
        SELECT
          rp.payment_status,
          count(*)::int AS payments,
          coalesce(sum(rp.amount_due), 0)::numeric(14,2) AS amount_due,
          coalesce(sum(rp.amount_paid), 0)::numeric(14,2) AS amount_paid
        FROM reservation_payments rp
        WHERE ${where.join(' AND ')}
        GROUP BY rp.payment_status
        ORDER BY rp.payment_status
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load payment report' });
  }
};
