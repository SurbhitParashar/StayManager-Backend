CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  legacy_booking_id integer UNIQUE,
  guest_id uuid NOT NULL REFERENCES public.guests(id),
  property_id integer NOT NULL REFERENCES public.properties(property_id),
  source text NOT NULL,
  reservation_made_on date,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  adult_count integer NOT NULL DEFAULT 1,
  child_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'booked',
  notes text,
  credit_card_collected_offline boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT reservations_date_check CHECK (departure_date > arrival_date),
  CONSTRAINT reservations_adult_count_check CHECK (adult_count >= 0),
  CONSTRAINT reservations_child_count_check CHECK (child_count >= 0),
  CONSTRAINT reservations_status_check CHECK (status IN ('inquiry', 'booked', 'cancelled', 'completed')),
  CONSTRAINT reservations_source_check CHECK (
    source IN (
      'vrbo',
      'airbnb',
      'google vacations',
      'direct',
      'returning guest',
      'social media',
      'facebook',
      'other'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_reservations_guest_id
  ON public.reservations (guest_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_property_id
  ON public.reservations (property_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_arrival_date
  ON public.reservations (arrival_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_departure_date
  ON public.reservations (departure_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON public.reservations (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_source
  ON public.reservations (source)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_property_dates
  ON public.reservations (property_id, arrival_date, departure_date)
  WHERE deleted_at IS NULL;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_no_overlapping_active_bookings'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_no_overlapping_active_bookings
      EXCLUDE USING gist (
        property_id WITH =,
        daterange(arrival_date, departure_date, '[)') WITH &&
      )
      WHERE (deleted_at IS NULL AND status = 'booked');
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON public.reservations;
CREATE TRIGGER trg_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
