CREATE TABLE IF NOT EXISTS public.rental_agreements (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  sent_at timestamptz,
  received_at timestamptz,
  status text NOT NULL DEFAULT 'not_sent',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_agreements_status_check CHECK (
    status IN ('not_sent', 'sent', 'received', 'waived')
  )
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  received boolean NOT NULL DEFAULT false,
  rating integer,
  review_text text,
  received_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 10)
);

CREATE TABLE IF NOT EXISTS public.property_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  property_id integer NOT NULL REFERENCES public.properties(property_id),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT property_events_date_check CHECK (end_date >= start_date),
  CONSTRAINT property_events_type_check CHECK (
    event_type IN ('reservation', 'owner_block', 'maintenance', 'housekeeping', 'other')
  )
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  contact_type text NOT NULL,
  name text NOT NULL,
  email extensions.citext,
  phone text,
  company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT contacts_type_check CHECK (
    contact_type IN ('owner', 'vendor', 'hoa', 'insurance', 'housekeeper', 'guest', 'other')
  )
);

CREATE TABLE IF NOT EXISTS public.property_contacts (
  property_id integer NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, contact_id, role)
);

CREATE INDEX IF NOT EXISTS idx_property_events_property_dates
  ON public.property_events (property_id, start_date, end_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_events_reservation_id
  ON public.property_events (reservation_id)
  WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_type
  ON public.contacts (contact_type)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_rental_agreements_updated_at ON public.rental_agreements;
CREATE TRIGGER trg_rental_agreements_updated_at
BEFORE UPDATE ON public.rental_agreements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_property_events_updated_at ON public.property_events;
CREATE TRIGGER trg_property_events_updated_at
BEFORE UPDATE ON public.property_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
