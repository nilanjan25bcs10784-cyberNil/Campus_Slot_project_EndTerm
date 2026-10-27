import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // Translate MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const keyPattern = err.keyPattern || {};
    if (keyPattern.slotKeys) {
      return res.status(409).json({
        error: {
          code: 'SLOT_ALREADY_BOOKED',
          message: 'Slot already booked',
        },
      });
    }
    if (keyPattern.email) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email is already registered',
        },
      });
    }
    if (keyPattern.user && keyPattern.resource && keyPattern.date && keyPattern.startTime) {
      return res.status(409).json({
        error: {
          code: 'ALREADY_WAITLISTED',
          message: 'You are already on the waitlist for this slot',
        },
      });
    }
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY_ERROR',
        message: 'A duplicate record already exists',
      },
    });
  }

  // Handle custom ApiError
  if (err instanceof ApiError) {
    const response = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details !== undefined) {
      response.error.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: `Invalid identifier format for field ${err.path}`,
      },
    });
  }

  // Log unexpected errors
  console.error('[Unhandled Error]', err);

  // Generic 500
  const statusCode = err.status || 500;
  const isProd = env.NODE_ENV === 'production';
  return res.status(statusCode).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProd ? 'An unexpected server error occurred' : err.message,
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}
