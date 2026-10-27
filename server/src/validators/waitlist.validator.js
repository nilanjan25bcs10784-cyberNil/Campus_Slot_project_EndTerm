import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const joinWaitlistSchema = z
  .object({
    resourceId: z.string().regex(mongoIdRegex, 'Invalid resource ID'),
    date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(timeRegex, 'startTime must be HH:mm'),
    endTime: z.string().regex(timeRegex, 'endTime must be HH:mm'),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'startTime must be earlier than endTime',
    path: ['endTime'],
  });
