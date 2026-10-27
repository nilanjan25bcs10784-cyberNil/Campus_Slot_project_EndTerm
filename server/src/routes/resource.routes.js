import { Router } from 'express';
import jwt from 'jsonwebtoken';
import * as resourceController from '../controllers/resource.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import {
  createResourceSchema,
  updateResourceSchema,
  availabilityQuerySchema,
  resourceCatalogQuerySchema,
} from '../validators/resource.validator.js';

const router = Router();

// Soft auth helper for availability
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-passwordHash');
    } catch (e) {
      // Ignore invalid token in optional auth
    }
  }
  next();
}

// Public catalog and details
router.get('/', validateQuery(resourceCatalogQuerySchema), resourceController.getResources);
router.get('/:id', resourceController.getResourceById);
router.get('/:id/availability', optionalAuth, validateQuery(availabilityQuerySchema), resourceController.getAvailability);

// Admin-only management
router.post('/', authenticate, requireRole('admin'), validateBody(createResourceSchema), resourceController.createResource);
router.put('/:id', authenticate, requireRole('admin'), validateBody(updateResourceSchema), resourceController.updateResource);
router.delete('/:id', authenticate, requireRole('admin'), resourceController.deleteResource);

export default router;
