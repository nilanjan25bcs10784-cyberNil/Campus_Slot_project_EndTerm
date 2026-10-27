import { Booking } from '../models/Booking.js';
import { Resource } from '../models/Resource.js';
import { BlockedWindow } from '../models/BlockedWindow.js';
import { createNotification } from './notification.service.js';
import { processWaitlistPromotion } from './waitlist.service.js';
import { ApiError } from '../utils/apiError.js';

export async function getAllBookings({ status }) {
  const query = {};
  if (status) {
    query.status = status;
  }

  return Booking.find(query)
    .populate(['resource', 'user'])
    .sort({ createdAt: -1 });
}

export async function approveBooking(bookingId, note = null) {
  const booking = await Booking.findById(bookingId).populate(['resource', 'user']);
  if (!booking) {
    throw ApiError.notFound('Booking not found', 'BOOKING_NOT_FOUND');
  }

  if (booking.status !== 'pending') {
    throw ApiError.badRequest(
      `Cannot approve booking with status '${booking.status}' (must be pending)`,
      'INVALID_STATUS'
    );
  }

  booking.status = 'approved';
  booking.expiresAt = null;
  if (note) {
    booking.decisionNote = note;
  }
  await booking.save();

  await createNotification({
    userId: booking.user._id || booking.user,
    type: 'booking_approved',
    message: `Your booking for ${booking.resource?.name || 'resource'} on ${booking.date} (${booking.startTime}-${booking.endTime}) has been approved!${note ? ` Note: ${note}` : ''}`,
    bookingId: booking._id,
  });

  return booking;
}

export async function rejectBooking(bookingId, note) {
  const booking = await Booking.findById(bookingId).populate(['resource', 'user']);
  if (!booking) {
    throw ApiError.notFound('Booking not found', 'BOOKING_NOT_FOUND');
  }

  if (booking.status !== 'pending') {
    throw ApiError.badRequest(
      `Cannot reject booking with status '${booking.status}' (must be pending)`,
      'INVALID_STATUS'
    );
  }

  booking.status = 'rejected';
  booking.decisionNote = note;
  booking.slotKeys = []; // free unique slot keys
  booking.expiresAt = null;
  await booking.save();

  await createNotification({
    userId: booking.user._id || booking.user,
    type: 'booking_rejected',
    message: `Your booking for ${booking.resource?.name || 'resource'} on ${booking.date} (${booking.startTime}-${booking.endTime}) was rejected. Reason: ${note}`,
    bookingId: booking._id,
  });

  // Waitlist promotion triggered on reject
  await processWaitlistPromotion(booking.resource._id || booking.resource, booking.date);

  return booking;
}

export async function createBlockedWindow({ resourceId, startAt, endAt, reason, adminId }) {
  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw ApiError.notFound('Resource not found', 'RESOURCE_NOT_FOUND');
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  // Find all conflicting active bookings on that resource during that window
  const conflictingBookings = await Booking.find({
    resource: resourceId,
    status: { $in: ['pending', 'approved'] },
    startAt: { $lt: endDate },
    endAt: { $gt: startDate },
  });

  // Cancel conflicting bookings & notify affected users (Rule 9: promotion logic not required here)
  for (const b of conflictingBookings) {
    b.status = 'cancelled';
    b.slotKeys = [];
    b.decisionNote = `Resource blocked: ${reason}`;
    await b.save();

    await createNotification({
      userId: b.user,
      type: 'booking_cancelled',
      message: `Your booking for ${resource.name} on ${b.date} (${b.startTime}-${b.endTime}) was cancelled due to an administrative block: "${reason}".`,
      bookingId: b._id,
    });
  }

  const blockedWindow = await BlockedWindow.create({
    resource: resourceId,
    startAt: startDate,
    endAt: endDate,
    reason,
    createdBy: adminId,
  });

  return {
    blockedWindow,
    cancelledBookingsCount: conflictingBookings.length,
  };
}
