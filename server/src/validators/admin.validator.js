import { z } from 'zod';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const approveBookingSchema = z.object({
  note: z.string().trim().max(300).optional(),
});

export const rejectBookingSchema = z.object({
  note: z.string().trim().min(1, 'Decision note is required when rejecting a booking').max(300),
});

export const createBlockedWindowSchema = z
  .object({
    resourceId: z.string().regex(mongoIdRegex, 'Invalid resource ID'),
    startAt: z.string().datetime({ message: 'startAt must be a valid ISO 8601 string' }),
    endAt: z.string().datetime({ message: 'endAt must be a valid ISO 8601 string' }),
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(300),
  })
  .refine((data) => new Date(data.startAt) < new Date(data.endAt), {
    message: 'startAt must be before endAt',
    path: ['endAt'],
  });
