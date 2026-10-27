import * as adminService from '../services/admin.service.js';
import * as analyticsService from '../services/analytics.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBookings = asyncHandler(async (req, res) => {
  const bookings = await adminService.getAllBookings(req.query);
  res.status(200).json({
    data: bookings,
  });
});

export const approveBooking = asyncHandler(async (req, res) => {
  const booking = await adminService.approveBooking(req.params.id, req.body?.note);
  res.status(200).json({
    data: booking,
  });
});

export const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await adminService.rejectBooking(req.params.id, req.body.note);
  res.status(200).json({
    data: booking,
  });
});

export const createBlockedWindow = asyncHandler(async (req, res) => {
  const result = await adminService.createBlockedWindow({
    ...req.body,
    adminId: req.user._id,
  });
  res.status(201).json({
    data: result,
  });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getAdminAnalytics();
  res.status(200).json({
    data: analytics,
  });
});
