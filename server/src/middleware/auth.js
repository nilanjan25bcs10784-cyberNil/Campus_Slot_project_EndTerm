import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token missing or invalid', 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return next(ApiError.unauthorized('Invalid or expired token', 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists', 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
