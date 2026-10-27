import { Router } from 'express';
import * as waitlistController from '../controllers/waitlist.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { joinWaitlistSchema } from '../validators/waitlist.validator.js';

const router = Router();

router.use(authenticate); // all waitlist routes require authentication

router.post('/', validateBody(joinWaitlistSchema), waitlistController.joinWaitlist);
router.get('/mine', waitlistController.getMyWaitlist);
router.delete('/:id', waitlistController.cancelWaitlist);

export default router;
