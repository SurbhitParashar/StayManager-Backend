CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  legacy_customer_id integer UNIQUE,
  first_name text NOT NULL,
  middle_initial text,
  last_name text NOT NULL,
  email extensions.citext,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'USA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_guests_email
  ON public.guests (email)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guests_name
  ON public.guests (last_name, first_name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guests_legacy_customer_id
  ON public.guests (legacy_customer_id)
  WHERE legacy_customer_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_guests_updated_at ON public.guests;
CREATE TRIGGER trg_guests_updated_at
BEFORE UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
