CREATE TABLE IF NOT EXISTS public.reservation_payments (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  payment_number integer,
  due_date date,
  amount_due numeric(12,2) NOT NULL DEFAULT 0,
  paid_date date,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT reservation_payments_amount_due_check CHECK (amount_due >= 0),
  CONSTRAINT reservation_payments_amount_paid_check CHECK (amount_paid >= 0),
  CONSTRAINT reservation_payments_status_check CHECK (
    payment_status IN ('pending', 'paid', 'partial', 'refunded', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_reservation_payments_reservation_id
  ON public.reservation_payments (reservation_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservation_payments_due_date
  ON public.reservation_payments (due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservation_payments_status
  ON public.reservation_payments (payment_status)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_reservation_payments_updated_at ON public.reservation_payments;
CREATE TRIGGER trg_reservation_payments_updated_at
BEFORE UPDATE ON public.reservation_payments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
