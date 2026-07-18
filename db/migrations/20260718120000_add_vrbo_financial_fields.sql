ALTER TABLE public.reservation_financials
  ADD COLUMN IF NOT EXISTS taxes_paid_by_vrbo numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid_to_vrbo numeric(12,2) NOT NULL DEFAULT 0;

UPDATE public.reservation_financials
SET amount_paid_to_vrbo = taxes_paid_by_vrbo + guest_service_fee + payment_processing_fee
WHERE amount_paid_to_vrbo = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservation_financials_vrbo_amounts_check'
  ) THEN
    ALTER TABLE public.reservation_financials
      ADD CONSTRAINT reservation_financials_vrbo_amounts_check
      CHECK (taxes_paid_by_vrbo >= 0 AND amount_paid_to_vrbo >= 0);
  END IF;
END;
$$;
