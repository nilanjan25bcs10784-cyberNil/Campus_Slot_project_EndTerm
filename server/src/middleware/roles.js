import { ApiError } from '../utils/apiError.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: requires one of [${allowedRoles.join(', ')}] roles`,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
