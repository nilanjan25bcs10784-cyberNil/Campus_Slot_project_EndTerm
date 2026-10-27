import { WaitlistEntry } from '../models/WaitlistEntry.js';
import { Resource } from '../models/Resource.js';
import { Booking } from '../models/Booking.js';
import { BlockedWindow } from '../models/BlockedWindow.js';
import { createNotification } from './notification.service.js';
import { ApiError } from '../utils/apiError.js';
import {
  createUtcDate,
  generateSlotKeys,
  isTimeAligned,
} from '../utils/time.js';

export async function joinWaitlist({ userId, resourceId, date, startTime, endTime }) {
  const resource = await Resource.findById(resourceId);
  if (!resource || !resource.isActive) {
    throw ApiError.notFound('Resource not found or inactive', 'RESOURCE_NOT_FOUND');
  }

  const startAt = createUtcDate(date, startTime);
  const endAt = createUtcDate(date, endTime);
  const now = new Date();

  // Rule 2: Future & within 14 days
  if (startAt <= now) {
    throw ApiError.badRequest('Cannot waitlist for past or ongoing slots', 'PAST_TIME');
  }

  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  if (startAt.getTime() > now.getTime() + fourteenDaysMs) {
    throw ApiError.badRequest('Waitlisting is only allowed up to 14 days in advance', 'OUTSIDE_BOOKING_WINDOW');
  }

  // Operating hours
  if (startTime < resource.openTime || endTime > resource.closeTime) {
    throw ApiError.badRequest('Requested slot is outside resource operating hours', 'OUTSIDE_OPERATING_HOURS');
  }

  // Alignment
  if (!isTimeAligned(startTime, resource.slotMinutes, resource.openTime) ||
      !isTimeAligned(endTime, resource.slotMinutes, resource.openTime)) {
    throw ApiError.badRequest(`Times must be aligned to ${resource.slotMinutes} minute intervals`, 'UNALIGNED_SLOT');
  }

  // Duration
  const durationMin = (endAt - startAt) / (1000 * 60);
  const maxMin = resource.maxDurationSlots * resource.slotMinutes;
  if (durationMin > maxMin) {
    throw ApiError.badRequest(`Booking duration cannot exceed ${maxMin} minutes (${resource.maxDurationSlots} slots)`, 'EXCEEDS_MAX_DURATION');
  }

  // Check 3-strike no-show restriction
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
        `Waitlisting restricted: You have accumulated 3 no-shows in the past 30 days. Restricted until ${restrictedUntil.toISOString()}`,
        'NO_SHOW_PENALTY_ACTIVE'
      );
    }
  }

  // Check if slot is already fully free (if free, advise user to book directly)
  const conflictingBooking = await Booking.findOne({
    resource: resourceId,
    status: { $in: ['pending', 'approved'] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });

  const conflictingBlocked = await BlockedWindow.findOne({
    resource: resourceId,
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });

  if (!conflictingBooking && !conflictingBlocked) {
    throw ApiError.badRequest(
      'This slot is currently available. You can book it directly instead of joining the waitlist.',
      'SLOT_IS_AVAILABLE'
    );
  }

  // Check if user is already on waitlist for this slot
  const existingEntry = await WaitlistEntry.findOne({
    user: userId,
    resource: resourceId,
    date,
    startTime,
    status: 'waiting',
  });
  if (existingEntry) {
    throw ApiError.conflict('You are already on the waitlist for this slot', 'ALREADY_WAITLISTED');
  }

  const entry = await WaitlistEntry.create({
    user: userId,
    resource: resourceId,
    date,
    startTime,
    endTime,
    status: 'waiting',
  });

  return entry.populate('resource');
}

export async function getUserWaitlist(userId) {
  return WaitlistEntry.find({ user: userId })
    .populate('resource')
    .sort({ createdAt: -1 });
}

export async function cancelWaitlistEntry(userId, entryId, userRole = 'student') {
  const query = { _id: entryId };
  if (userRole !== 'admin') {
    query.user = userId;
  }

  const entry = await WaitlistEntry.findOne(query);
  if (!entry) {
    throw ApiError.notFound('Waitlist entry not found or unauthorized', 'WAITLIST_NOT_FOUND');
  }

  entry.status = 'cancelled';
  await entry.save();
  return entry;
}

/**
 * Evaluates the waitlist queue for a resource and promotes the oldest eligible candidate
 * @param {string|import('mongoose').Types.ObjectId} resourceId
 * @param {string} date
 */
export async function processWaitlistPromotion(resourceId, date) {
  const candidates = await WaitlistEntry.find({
    resource: resourceId,
    date,
    status: 'waiting',
  }).sort({ createdAt: 1 }); // FIFO order

  if (!candidates.length) return null;

  const resource = await Resource.findById(resourceId);
  if (!resource || !resource.isActive) return null;

  const now = new Date();

  for (const entry of candidates) {
    const startAt = createUtcDate(entry.date, entry.startTime);
    const endAt = createUtcDate(entry.date, entry.endTime);

    // If candidate slot is in the past, mark expired
    if (startAt <= now) {
      entry.status = 'expired';
      await entry.save();
      continue;
    }

    // Check if slot range is now fully free
    const activeBooking = await Booking.findOne({
      resource: resourceId,
      status: { $in: ['pending', 'approved'] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (activeBooking) continue;

    const blocked = await BlockedWindow.findOne({
      resource: resourceId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (blocked) continue;

    // Check candidate user: Rule 4 (max 3 active bookings & overlapping user bookings)
    const userActiveBookingsCount = await Booking.countDocuments({
      user: entry.user,
      status: { $in: ['pending', 'approved'] },
      endAt: { $gt: now },
    });
    if (userActiveBookingsCount >= 3) {
      // User has reached maximum bookings, skip to next candidate
      continue;
    }

    const userOverlap = await Booking.findOne({
      user: entry.user,
      status: { $in: ['pending', 'approved'] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (userOverlap) {
      // User has conflicting booking on another resource, skip
      continue;
    }

    // Check Rule 10 (3 no-shows penalty)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentNoShows = await Booking.find({
      user: entry.user,
      status: 'no_show',
      startAt: { $gte: thirtyDaysAgo },
    }).sort({ startAt: -1 });

    if (recentNoShows.length >= 3) {
      const latestNoShow = recentNoShows[0];
      const restrictedUntil = new Date(latestNoShow.startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (restrictedUntil > now) {
        continue;
      }
    }

    // Everything is clear: Promote this candidate!
    const slotKeys = generateSlotKeys(
      resource._id,
      entry.date,
      entry.startTime,
      entry.endTime,
      resource.slotMinutes
    );

    const requiresApproval = resource.requiresApproval;
    const bookingStatus = requiresApproval ? 'pending' : 'approved';
    const expiresAt = requiresApproval ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null;

    try {
      const newBooking = await Booking.create({
        user: entry.user,
        resource: resource._id,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        startAt,
        endAt,
        purpose: 'Promoted from waitlist',
        status: bookingStatus,
        expiresAt,
        slotKeys,
      });

      entry.status = 'promoted';
      await entry.save();

      await createNotification({
        userId: entry.user,
        type: 'waitlist_promoted',
        message: `Great news! You were promoted from the waitlist for ${resource.name} on ${entry.date} (${entry.startTime} - ${entry.endTime}). Status: ${bookingStatus}.`,
        bookingId: newBooking._id,
      });

      console.log(`[Waitlist Promotion] Promoted user ${entry.user} for ${resource.name} (${entry.date} ${entry.startTime})`);
      return newBooking;
    } catch (err) {
      if (err.code === 11000) {
        // Race condition: slot taken in parallel, continue to next
        continue;
      }
      throw err;
    }
  }

  return null;
}
