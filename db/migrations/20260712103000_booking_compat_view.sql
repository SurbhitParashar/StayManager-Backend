CREATE OR REPLACE VIEW public.booking_compat_view AS
SELECT
  coalesce(r.legacy_booking_id, 0) AS booking_id,
  g.legacy_customer_id AS customer_id,
  r.property_id,
  g.first_name || ' ' || g.last_name AS name,
  g.email::text AS email,
  g.phone,
  p.property_name::text AS property_name,
  CASE r.source
    WHEN 'vrbo' THEN 'vrbo'
    WHEN 'airbnb' THEN 'airbnb'
    ELSE 'others'
  END AS platform,
  r.arrival_date AS start_date,
  r.departure_date AS end_date,
  rf.total_guest_payment AS total_amount,
  coalesce(
    (
      SELECT rp.payment_method
      FROM public.reservation_payments rp
      WHERE rp.reservation_id = r.id
        AND rp.deleted_at IS NULL
      ORDER BY rp.payment_number NULLS LAST, rp.created_at
      LIMIT 1
    ),
    'online transaction'
  ) AS payment_mode,
  r.status,
  r.notes,
  r.created_at,
  r.id AS reservation_id,
  r.guest_id
FROM public.reservations r
JOIN public.guests g ON g.id = r.guest_id
JOIN public.properties p ON p.property_id = r.property_id
LEFT JOIN public.reservation_financials rf ON rf.reservation_id = r.id
WHERE r.deleted_at IS NULL;
