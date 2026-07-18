CREATE TABLE IF NOT EXISTS public.legacy_customer_guest_map (
  legacy_customer_id integer PRIMARY KEY REFERENCES public.customers(customer_id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL UNIQUE REFERENCES public.guests(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

WITH parsed_customers AS (
  SELECT
    c.customer_id,
    trim(c.name) AS full_name,
    c.email,
    c.phone,
    c.created_at,
    split_part(trim(c.name), ' ', 1) AS first_name,
    CASE
      WHEN position(' ' in trim(c.name)) > 0
        THEN regexp_replace(trim(c.name), '^\S+\s+', '')
      ELSE trim(c.name)
    END AS last_name
  FROM public.customers c
),
inserted_guests AS (
  INSERT INTO public.guests (
    legacy_customer_id,
    first_name,
    last_name,
    email,
    phone,
    created_at,
    updated_at
  )
  SELECT
    customer_id,
    nullif(first_name, ''),
    nullif(last_name, ''),
    email,
    phone,
    coalesce(created_at::timestamptz, now()),
    now()
  FROM parsed_customers
  ON CONFLICT (legacy_customer_id) DO UPDATE
    SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = now()
  RETURNING legacy_customer_id, id
)
INSERT INTO public.legacy_customer_guest_map (legacy_customer_id, guest_id)
SELECT legacy_customer_id, id
FROM inserted_guests
ON CONFLICT (legacy_customer_id) DO UPDATE
  SET guest_id = EXCLUDED.guest_id;
