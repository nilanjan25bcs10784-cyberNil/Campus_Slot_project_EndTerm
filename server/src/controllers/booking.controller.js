import * as bookingService from '../services/booking.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking({
    userId: req.user._id,
    ...req.body,
  });
  res.status(201).json({
    data: booking,
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getMyBookings(req.user._id);
  res.status(200).json({
    data: bookings,
  });
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.params.id,
    req.user._id,
    req.user.role
  );
  res.status(200).json({
    data: booking,
  });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user._id,
    req.user.role,
    req.body?.reason
  );
  res.status(200).json({
    data: booking,
  });
});

export const checkInBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.checkInBooking(req.params.id, req.user._id);
  res.status(200).json({
    data: booking,
  });
});
