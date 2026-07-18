CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS rental_type text,
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.properties
SET
  short_code = CASE property_name::text
    WHEN 'Heron Marsh - Short term rentals' THEN 'HM'
    WHEN 'Avian Forest - Short term rentals' THEN 'AF'
    WHEN 'Montreat - Short term rentals' THEN 'M'
    WHEN 'Sequoyah Square - Long term rentals' THEN 'SS'
    WHEN 'Washington Pike - Long term rentals' THEN 'WP'
    ELSE short_code
  END,
  rental_type = CASE
    WHEN property_name::text ILIKE '%Long term%' THEN 'long_term'
    ELSE 'short_term'
  END
WHERE short_code IS NULL OR rental_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_rental_type_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_rental_type_check
      CHECK (rental_type IS NULL OR rental_type IN ('short_term', 'long_term'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS properties_short_code_key
  ON public.properties (short_code)
  WHERE short_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_active
  ON public.properties (is_active)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_properties_updated_at ON public.properties;
CREATE TRIGGER trg_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
