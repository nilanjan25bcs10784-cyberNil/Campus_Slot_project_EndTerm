import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const baseResourceSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  type: z.enum(['study_room', 'lab', 'court', 'equipment'], {
    errorMap: () => ({ message: 'Invalid resource type' }),
  }),
  description: z.string().trim().min(2, 'Description is required').max(1000),
  location: z.string().trim().min(2, 'Location is required').max(100),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  openTime: z.string().regex(timeRegex, 'openTime must be HH:mm (e.g. 08:00)'),
  closeTime: z.string().regex(timeRegex, 'closeTime must be HH:mm (e.g. 22:00)'),
  slotMinutes: z.coerce.number().refine((val) => val === 30 || val === 60, {
    message: 'slotMinutes must be either 30 or 60',
  }),
  maxDurationSlots: z.coerce.number().int().min(1).default(4),
  requiresApproval: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createResourceSchema = baseResourceSchema.refine(
  (data) => data.openTime < data.closeTime,
  {
    message: 'openTime must be earlier than closeTime',
    path: ['closeTime'],
  }
);

export const updateResourceSchema = baseResourceSchema.partial();

export const resourceCatalogQuerySchema = z.object({
  type: z.enum(['study_room', 'lab', 'court', 'equipment']).optional(),
  q: z.string().trim().optional(),
  minCapacity: z.coerce.number().int().min(1).optional(),
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD').optional(),
  startTime: z.string().regex(timeRegex, 'startTime must be HH:mm').optional(),
  endTime: z.string().regex(timeRegex, 'endTime must be HH:mm').optional(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
});
