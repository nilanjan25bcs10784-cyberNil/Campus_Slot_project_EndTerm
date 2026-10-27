import { Booking } from '../models/Booking.js';
import { Resource } from '../models/Resource.js';
import { BlockedWindow } from '../models/BlockedWindow.js';
import { createNotification } from './notification.service.js';
import { processWaitlistPromotion } from './waitlist.service.js';
import { ApiError } from '../utils/apiError.js';
import {
  createUtcDate,
  generateSlotKeys,
  isTimeAligned,
} from '../utils/time.js';

export async function createBooking({ userId, resourceId, date, startTime, endTime, purpose }) {
  const resource = await Resource.findById(resourceId);
  if (!resource || !resource.isActive) {
    throw ApiError.notFound('Resource not found or inactive', 'RESOURCE_NOT_FOUND');
  }

  const startAt = createUtcDate(date, startTime);
  const endAt = createUtcDate(date, endTime);
  const now = new Date();

  // Rule 2: Booking must be in the future
  if (startAt <= now) {
    throw ApiError.badRequest('Booking must be in the future', 'PAST_TIME');
  }

  // Rule 2: Within 14 days ahead
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  if (startAt.getTime() > now.getTime() + fourteenDaysMs) {
    throw ApiError.badRequest('Bookings can only be scheduled up to 14 days in advance', 'OUTSIDE_BOOKING_WINDOW');
  }

  // Rule 2: Within resource operating hours
  if (startTime < resource.openTime || endTime > resource.closeTime) {
    throw ApiError.badRequest(
      `Booking is outside operating hours (${resource.openTime} - ${resource.closeTime})`,
      'OUTSIDE_OPERATING_HOURS'
    );
  }

  // Rule 2: Aligned to slotMinutes
  if (!isTimeAligned(startTime, resource.slotMinutes, resource.openTime) ||
      !isTimeAligned(endTime, resource.slotMinutes, resource.openTime)) {
    throw ApiError.badRequest(
      `Booking times must be aligned to ${resource.slotMinutes}-minute slots from open time (${resource.openTime})`,
      'UNALIGNED_SLOT'
    );
  }

  // Rule 2: Length <= maxDurationSlots * slotMinutes
  const durationMin = (endAt - startAt) / (1000 * 60);
  const maxAllowedMin = resource.maxDurationSlots * resource.slotMinutes;
  if (durationMin > maxAllowedMin) {
    throw ApiError.badRequest(
      `Booking duration exceeds maximum allowed limit of ${maxAllowedMin} minutes (${resource.maxDurationSlots} slots)`,
      'EXCEEDS_MAX_DURATION'
    );
  }

  // Rule 10: 3 no-shows in 30 days restriction
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentNoShows = await Booking.find({
    user: userId,
    status: 'no_show',
    startAt: { $gte: thirtyDaysAgo },
  }).sort({ startAt: -1 });

  if (recentNoShows.length >= 3) {
    const latestNoShow = recentNoShows[0];
    const restrictedUntil = new Date(latestNoShow.startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (restrictedUntil > now) {
      throw ApiError.forbidden(
        `Booking restricted: You have accumulated 3 no-shows in the past 30 days. Restricted until ${restrictedUntil.toISOString()}`,
        'NO_SHOW_PENALTY_ACTIVE'
      );
    }
  }

  // Rule 4: At most 3 active (pending/approved, future) bookings for student
  const activeBookingsCount = await Booking.countDocuments({
    user: userId,
    status: { $in: ['pending', 'approved'] },
    endAt: { $gt: now },
  });

  if (activeBookingsCount >= 3) {
    throw ApiError.badRequest(
      'Active bookings limit reached: Students may hold at most 3 active bookings at a time',
      'ACTIVE_BOOKINGS_LIMIT_REACHED'
    );
  }

  // Rule 4: Cannot book two resources at overlapping times
  const userOverlap = await Booking.findOne({
    user: userId,
    status: { $in: ['pending', 'approved'] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });

  if (userOverlap) {
    throw ApiError.badRequest(
      'You already have an active booking overlapping with this time window',
      'USER_TIME_OVERLAP'
    );
  }

  // Rule 3: No overlap with pending/approved booking on the same resource
  const resourceOverlap = await Booking.findOne({
    resource: resourceId,
    status: { $in: ['pending', 'approved'] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });

  if (resourceOverlap) {
    throw ApiError.conflict('Slot already booked', 'SLOT_ALREADY_BOOKED');
  }

  // Rule 3: No overlap with BlockedWindow
  const blockedOverlap = await BlockedWindow.findOne({
    resource: resourceId,
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });

  if (blockedOverlap) {
    throw ApiError.conflict(
      `Time slot is blocked: ${blockedOverlap.reason}`,
      'SLOT_BLOCKED'
    );
  }

  // Generate atomic slot keys for concurrency protection
  const slotKeys = generateSlotKeys(
    resource._id,
    date,
    startTime,
    endTime,
    resource.slotMinutes
  );

  // Rule 5: requiresApproval -> pending (expires in 24h), else approved
  const requiresApproval = resource.requiresApproval;
  const status = requiresApproval ? 'pending' : 'approved';
  const expiresAt = requiresApproval ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null;

  try {
    const booking = await Booking.create({
      user: userId,
      resource: resourceId,
      date,
      startTime,
      endTime,
      startAt,
      endAt,
      purpose,
      status,
      expiresAt,
      slotKeys,
    });

    // Notify user
    const message = requiresApproval
      ? `Your booking request for ${resource.name} on ${date} (${startTime}-${endTime}) has been submitted and is pending faculty approval.`
      : `Your booking for ${resource.name} on ${date} (${startTime}-${endTime}) is confirmed!`;

    await createNotification({
      userId,
      type: requiresApproval ? 'booking_created' : 'booking_approved',
      message,
      bookingId: booking._id,
    });

    return booking.populate(['resource', 'user']);
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict('Slot already booked', 'SLOT_ALREADY_BOOKED');
    }
    throw err;
  }
}

export async function getMyBookings(userId) {
  return Booking.find({ user: userId })
    .populate('resource')
    .sort({ startAt: -1 });
}

export async function getBookingById(bookingId, userId, userRole = 'student') {
  const booking = await Booking.findById(bookingId).populate(['resource', 'user']);
  if (!booking) {
    throw ApiError.notFound('Booking not found', 'BOOKING_NOT_FOUND');
  }

  if (userRole !== 'admin' && String(booking.user._id || booking.user) !== String(userId)) {
    throw ApiError.forbidden('You do not have permission to view this booking', 'FORBIDDEN');
  }

  return booking;
}

export async function cancelBooking(bookingId, userId, userRole = 'student', reason = null) {
  const booking = await Booking.findById(bookingId).populate('resource');
  if (!booking) {
    throw ApiError.notFound('Booking not found', 'BOOKING_NOT_FOUND');
  }

  // Ownership check
  if (userRole !== 'admin' && String(booking.user) !== String(userId)) {
    throw ApiError.forbidden('You can only cancel your own bookings', 'FORBIDDEN');
  }

  if (!['pending', 'approved'].includes(booking.status)) {
    throw ApiError.badRequest(
      `Cannot cancel booking with current status: ${booking.status}`,
      'CANNOT_CANCEL'
    );
  }

  const now = new Date();

  // Rule 6: Cancelling < 60 min before start sets lateCancellation = true
  const sixtyMinMs = 60 * 60 * 1000;
  if (booking.startAt.getTime() - now.getTime() < sixtyMinMs) {
    booking.lateCancellation = true;
  }

  // Rule 6: Cancelling frees slotKeys
  booking.slotKeys = [];
  booking.status = 'cancelled';
  if (reason) {
    booking.decisionNote = reason;
  }

  await booking.save();

  // Create notification
  await createNotification({
    userId: booking.user,
    type: 'booking_cancelled',
    message: `Your booking for ${booking.resource?.name || 'resource'} on ${booking.date} (${booking.startTime}-${booking.endTime}) was cancelled.`,
    bookingId: booking._id,
  });

  // Rule 7: Run waitlist promotion
  await processWaitlistPromotion(booking.resource._id || booking.resource, booking.date);

  return booking;
}

export async function checkInBooking(bookingId, userId) {
  const booking = await Booking.findById(bookingId).populate('resource');
  if (!booking) {
    throw ApiError.notFound('Booking not found', 'BOOKING_NOT_FOUND');
  }

  // Ownership check
  if (String(booking.user) !== String(userId)) {
    throw ApiError.forbidden('You can only check into your own bookings', 'FORBIDDEN');
  }

  if (booking.status !== 'approved') {
    throw ApiError.badRequest(
      `Check-in is only valid for approved bookings (current: ${booking.status})`,
      'INVALID_STATUS_FOR_CHECKIN'
    );
  }

  if (booking.checkedInAt) {
    throw ApiError.badRequest('Booking has already been checked in', 'ALREADY_CHECKED_IN');
  }

  const now = Date.now();
  const startTimeMs = booking.startAt.getTime();

  // Rule 8: Allowed from 10 min before start to 15 min after start
  const windowStart = startTimeMs - 10 * 60 * 1000;
  const windowEnd = startTimeMs + 15 * 60 * 1000;

  if (now < windowStart) {
    throw ApiError.badRequest(
      'Check-in is only available starting 10 minutes before your scheduled start time',
      'CHECK_IN_TOO_EARLY'
    );
  }

  if (now > windowEnd) {
    throw ApiError.badRequest(
      'Check-in window has expired (closes 15 minutes after scheduled start time)',
      'CHECK_IN_WINDOW_EXPIRED'
    );
  }

  booking.checkedInAt = new Date();
  await booking.save();

  return booking;
}
