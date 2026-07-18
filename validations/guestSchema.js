const { z } = require('zod');

const guestSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_initial: z.string().max(5).optional().nullable(),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(30).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

module.exports = guestSchema;
