import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  approveBookingSchema,
  rejectBookingSchema,
  createBlockedWindowSchema,
} from '../validators/admin.validator.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireRole('admin'));

router.get('/bookings', adminController.getBookings);
router.post('/bookings/:id/approve', validateBody(approveBookingSchema), adminController.approveBooking);
router.post('/bookings/:id/reject', validateBody(rejectBookingSchema), adminController.rejectBooking);
router.post('/blocked-windows', validateBody(createBlockedWindowSchema), adminController.createBlockedWindow);
router.get('/analytics', adminController.getAnalytics);

export default router;
