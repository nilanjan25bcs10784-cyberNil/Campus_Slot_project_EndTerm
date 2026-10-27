import { ApiError } from '../utils/apiError.js';

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return next(ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', details));
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const details = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return next(ApiError.badRequest('Query validation failed', 'VALIDATION_ERROR', details));
  }
  req.query = result.data;
  next();
};
