const { z } = require('zod');

const bookingSchema = z.object({
  name: z.string().min(2),

  email: z.string().email(),

  phone: z.string().min(8).max(15),

  property_id: z.number(),

  platform: z.enum(['vrbo', 'airbnb', 'others']),

  start_date: z.string(),

  end_date: z.string(),

  total_amount: z.number().positive(),

  payment_mode: z.enum([
    'online transaction',
    'cash transaction'
  ]),

  status: z.enum(['booked', 'cancelled']).optional()
})
.refine(data =>
  new Date(data.end_date) > new Date(data.start_date),
  {
    message: 'End date must be after start date',
    path: ['end_date']
  }
);

module.exports = bookingSchema;