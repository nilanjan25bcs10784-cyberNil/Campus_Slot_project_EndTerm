import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { createBookingSchema, cancelBookingSchema } from '../validators/booking.validator.js';

const router = Router();

router.use(authenticate); // all booking routes require authentication

router.post('/', validateBody(createBookingSchema), bookingController.createBooking);
router.get('/mine', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/:id/cancel', validateBody(cancelBookingSchema), bookingController.cancelBooking);
router.post('/:id/check-in', bookingController.checkInBooking);

export default router;
