const { z } = require('zod');

const createBookingSchema = z.object({
  serviceId: z.number().int().positive(),
  // ISO datetime string (ej: 2025-09-20T14:00:00.000Z)
  datetime: z.string().datetime().or(z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Invalid date')),
  notes: z.string().trim().max(500).optional(),
});

module.exports = { createBookingSchema };