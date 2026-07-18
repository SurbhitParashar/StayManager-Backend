CREATE TABLE IF NOT EXISTS public.reservation_financials (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  rent_total numeric(12,2) NOT NULL DEFAULT 0,
  cleaning_fee numeric(12,2) NOT NULL DEFAULT 0,
  gate_fee numeric(12,2) NOT NULL DEFAULT 0,
  pet_fee numeric(12,2) NOT NULL DEFAULT 0,
  golf_cart_fee numeric(12,2) NOT NULL DEFAULT 0,
  other_fee numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  adjustment_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  guest_service_fee numeric(12,2) NOT NULL DEFAULT 0,
  payment_processing_fee numeric(12,2) NOT NULL DEFAULT 0,
  platform_fee numeric(12,2) NOT NULL DEFAULT 0,
  total_guest_payment numeric(12,2) NOT NULL DEFAULT 0,
  subtotal_due_owner numeric(12,2) NOT NULL DEFAULT 0,
  payout_to_owner numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_financials_non_negative_check CHECK (
    rent_total >= 0
    AND cleaning_fee >= 0
    AND gate_fee >= 0
    AND pet_fee >= 0
    AND golf_cart_fee >= 0
    AND other_fee >= 0
    AND discount_amount >= 0
    AND tax_amount >= 0
    AND guest_service_fee >= 0
    AND payment_processing_fee >= 0
    AND platform_fee >= 0
    AND total_guest_payment >= 0
    AND subtotal_due_owner >= 0
    AND payout_to_owner >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_reservation_financials_reservation_id
  ON public.reservation_financials (reservation_id);

DROP TRIGGER IF EXISTS trg_reservation_financials_updated_at ON public.reservation_financials;
CREATE TRIGGER trg_reservation_financials_updated_at
BEFORE UPDATE ON public.reservation_financials
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
