CREATE TABLE IF NOT EXISTS public.legacy_booking_reservation_map (
  legacy_booking_id integer PRIMARY KEY REFERENCES public.bookings(booking_id) ON DELETE RESTRICT,
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

WITH inserted_reservations AS (
  INSERT INTO public.reservations (
    legacy_booking_id,
    guest_id,
    property_id,
    source,
    arrival_date,
    departure_date,
    status,
    created_at,
    updated_at
  )
  SELECT
    b.booking_id,
    cg.guest_id,
    b.property_id,
    CASE b.platform::text
      WHEN 'vrbo' THEN 'vrbo'
      WHEN 'airbnb' THEN 'airbnb'
      ELSE 'other'
    END AS source,
    b.start_date,
    b.end_date,
    coalesce(b.status::text, 'booked'),
    coalesce(b.created_at::timestamptz, now()),
    now()
  FROM public.bookings b
  JOIN public.legacy_customer_guest_map cg
    ON cg.legacy_customer_id = b.customer_id
  ON CONFLICT (legacy_booking_id) DO UPDATE
    SET
      guest_id = EXCLUDED.guest_id,
      property_id = EXCLUDED.property_id,
      source = EXCLUDED.source,
      arrival_date = EXCLUDED.arrival_date,
      departure_date = EXCLUDED.departure_date,
      status = EXCLUDED.status,
      updated_at = now()
  RETURNING legacy_booking_id, id
)
INSERT INTO public.legacy_booking_reservation_map (legacy_booking_id, reservation_id)
SELECT legacy_booking_id, id
FROM inserted_reservations
ON CONFLICT (legacy_booking_id) DO UPDATE
  SET reservation_id = EXCLUDED.reservation_id;
