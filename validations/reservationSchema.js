const { z } = require('zod');

const money = z.coerce.number().min(0).default(0);

const financialSchema = z.object({
  rent_total: money,
  cleaning_fee: money,
  gate_fee: money,
  pet_fee: money,
  golf_cart_fee: money,
  other_fee: money,
  discount_amount: money,
  adjustment_amount: z.coerce.number().default(0),
  tax_amount: money,
  taxes_paid_by_vrbo: money,
  guest_service_fee: money,
  payment_processing_fee: money,
  platform_fee: money,
  amount_paid_to_vrbo: money,
  total_guest_payment: money,
  subtotal_due_owner: money,
  payout_to_owner: money,
}).partial();

const paymentSchema = z.object({
  payment_number: z.coerce.number().int().positive().optional().nullable(),
  due_date: z.string().optional().nullable(),
  amount_due: money,
  paid_date: z.string().optional().nullable(),
  amount_paid: money,
  payment_method: z.string().optional().nullable(),
  payment_status: z.enum(['pending', 'paid', 'partial', 'refunded', 'cancelled']).default('pending'),
  notes: z.string().optional().nullable(),
});

const guestInlineSchema = z.object({
  first_name: z.string().min(1),
  middle_initial: z.string().max(5).optional().nullable(),
  last_name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

const reservationSchema = z.object({
  guest_id: z.string().uuid().optional().nullable(),
  guest: guestInlineSchema.optional(),
  property_id: z.coerce.number().int().positive(),
  source: z.enum([
    'vrbo',
    'airbnb',
    'google vacations',
    'direct',
    'returning guest',
    'social media',
    'facebook',
    'other',
  ]),
  reservation_made_on: z.string().optional().nullable(),
  arrival_date: z.string().min(1),
  departure_date: z.string().min(1),
  adult_count: z.coerce.number().int().min(0).default(1),
  child_count: z.coerce.number().int().min(0).default(0),
  status: z.enum(['inquiry', 'booked', 'cancelled', 'completed']).default('booked'),
  notes: z.string().optional().nullable(),
  credit_card_collected_offline: z.coerce.boolean().default(false),
  financials: financialSchema.optional(),
  payments: z.array(paymentSchema).optional(),
  agreement: z.object({
    sent: z.coerce.boolean().default(false),
    received: z.coerce.boolean().default(false),
    sent_at: z.string().optional().nullable(),
    received_at: z.string().optional().nullable(),
  }).optional(),
  review: z.object({
    received: z.coerce.boolean().default(false),
    rating: z.coerce.number().int().min(1).max(10).optional().nullable(),
  }).optional(),
}).refine(
  (data) => new Date(data.departure_date) > new Date(data.arrival_date),
  {
    message: 'Departure date must be after arrival date',
    path: ['departure_date'],
  }
).refine(
  (data) => Boolean(data.guest_id || data.guest),
  {
    message: 'Select an existing guest or enter a new guest',
    path: ['guest_id'],
  }
).refine(
  (data) => {
    const financials = data.financials;
    if (!financials?.total_guest_payment) return true;

    const amountPaidToVrbo = Number(
      financials.amount_paid_to_vrbo ??
      (
        Number(financials.taxes_paid_by_vrbo || 0) +
        Number(financials.guest_service_fee || 0) +
        Number(financials.payment_processing_fee || 0)
      )
    );
    const payoutToOwner = Number(financials.payout_to_owner || 0);
    const totalGuestPayment = Number(financials.total_guest_payment || 0);

    return Math.abs(totalGuestPayment - (amountPaidToVrbo + payoutToOwner)) < 0.01;
  },
  {
    message: 'Total guest payment must equal amount paid to VRBO plus payout to owner',
    path: ['financials', 'total_guest_payment'],
  }
);

module.exports = {
  reservationSchema,
  financialSchema,
  paymentSchema,
};
