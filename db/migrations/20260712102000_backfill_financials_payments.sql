INSERT INTO public.reservation_financials (
  reservation_id,
  rent_total,
  total_guest_payment,
  subtotal_due_owner,
  payout_to_owner,
  created_at,
  updated_at
)
SELECT
  br.reservation_id,
  b.total_amount,
  b.total_amount,
  b.total_amount,
  b.total_amount,
  coalesce(b.created_at::timestamptz, now()),
  now()
FROM public.bookings b
JOIN public.legacy_booking_reservation_map br
  ON br.legacy_booking_id = b.booking_id
ON CONFLICT (reservation_id) DO UPDATE
  SET
    rent_total = EXCLUDED.rent_total,
    total_guest_payment = EXCLUDED.total_guest_payment,
    subtotal_due_owner = EXCLUDED.subtotal_due_owner,
    payout_to_owner = EXCLUDED.payout_to_owner,
    updated_at = now();

INSERT INTO public.reservation_payments (
  reservation_id,
  payment_number,
  amount_due,
  paid_date,
  amount_paid,
  payment_method,
  payment_status,
  created_at,
  updated_at
)
SELECT
  br.reservation_id,
  1,
  b.total_amount,
  b.created_at::date,
  b.total_amount,
  b.payment_mode::text,
  'paid',
  coalesce(b.created_at::timestamptz, now()),
  now()
FROM public.bookings b
JOIN public.legacy_booking_reservation_map br
  ON br.legacy_booking_id = b.booking_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.reservation_payments rp
  WHERE rp.reservation_id = br.reservation_id
    AND rp.payment_number = 1
    AND rp.deleted_at IS NULL
);
