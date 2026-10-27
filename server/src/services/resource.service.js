import { Resource } from '../models/Resource.js';
import { Booking } from '../models/Booking.js';
import { BlockedWindow } from '../models/BlockedWindow.js';
import { ApiError } from '../utils/apiError.js';
import {
  createUtcDate,
  timeToMinutes,
  minutesToTime,
  isTimeAligned,
} from '../utils/time.js';

export async function getResources({ type, q, minCapacity, date, startTime, endTime }) {
  const query = { isActive: true };

  if (type) {
    query.type = type;
  }

  if (minCapacity) {
    query.capacity = { $gte: Number(minCapacity) };
  }

  if (q) {
    const regex = new RegExp(q, 'i');
    query.$or = [{ name: regex }, { location: regex }, { description: regex }];
  }

  let resources = await Resource.find(query).sort({ name: 1 });

  // If date and times are provided, filter down to only available resources
  if (date && startTime && endTime) {
    const reqStartAt = createUtcDate(date, startTime);
    const reqEndAt = createUtcDate(date, endTime);
    const reqDurationMin = (reqEndAt - reqStartAt) / (1000 * 60);

    const availableResources = [];

    for (const res of resources) {
      // 1. Check open/close hours
      if (res.openTime > startTime || res.closeTime < endTime) {
        continue;
      }

      // 2. Check alignment & max duration
      if (!isTimeAligned(startTime, res.slotMinutes, res.openTime)) {
        continue;
      }
      if (!isTimeAligned(endTime, res.slotMinutes, res.openTime)) {
        continue;
      }
      if (reqDurationMin > res.maxDurationSlots * res.slotMinutes) {
        continue;
      }

      // 3. Check overlapping active bookings
      const conflictingBooking = await Booking.findOne({
        resource: res._id,
        status: { $in: ['pending', 'approved'] },
        startAt: { $lt: reqEndAt },
        endAt: { $gt: reqStartAt },
      });
      if (conflictingBooking) continue;

      // 4. Check overlapping blocked windows
      const conflictingBlocked = await BlockedWindow.findOne({
        resource: res._id,
        startAt: { $lt: reqEndAt },
        endAt: { $gt: reqStartAt },
      });
      if (conflictingBlocked) continue;

      availableResources.push(res);
    }

    resources = availableResources;
  }

  return resources;
}

export async function getResourceById(id) {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw ApiError.notFound('Resource not found', 'RESOURCE_NOT_FOUND');
  }
  return resource;
}

export async function getResourceAvailability(resourceId, dateStr, currentUserId = null) {
  const resource = await getResourceById(resourceId);

  const startMin = timeToMinutes(resource.openTime);
  const endMin = timeToMinutes(resource.closeTime);

  // Day window in UTC
  const dayStart = createUtcDate(dateStr, resource.openTime);
  const dayEnd = createUtcDate(dateStr, resource.closeTime);

  // Fetch all active bookings for this resource on this day
  const bookings = await Booking.find({
    resource: resource._id,
    status: { $in: ['pending', 'approved'] },
    startAt: { $lt: dayEnd },
    endAt: { $gt: dayStart },
  }).lean();

  // Fetch all blocked windows for this resource overlapping this day
  const blockedWindows = await BlockedWindow.find({
    resource: resource._id,
    startAt: { $lt: dayEnd },
    endAt: { $gt: dayStart },
  }).lean();

  const slots = [];

  for (let current = startMin; current < endMin; current += resource.slotMinutes) {
    const slotStartStr = minutesToTime(current);
    const slotEndStr = minutesToTime(current + resource.slotMinutes);

    const slotStartAt = createUtcDate(dateStr, slotStartStr);
    const slotEndAt = createUtcDate(dateStr, slotEndStr);

    // If slot start has already passed in real-time, mark as blocked (not bookable)
    const now = new Date();
    if (slotStartAt <= now) {
      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        state: 'blocked',
      });
      continue;
    }

    // Check blocked window
    const isBlocked = blockedWindows.some(
      (bw) => slotStartAt < bw.endAt && slotEndAt > bw.startAt
    );

    if (isBlocked) {
      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        state: 'blocked',
      });
      continue;
    }

    // Check booking
    const matchingBooking = bookings.find(
      (b) => slotStartAt < b.endAt && slotEndAt > b.startAt
    );

    if (matchingBooking) {
      const isMine =
        currentUserId &&
        String(matchingBooking.user) === String(currentUserId);

      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        state: isMine ? 'mine' : 'booked',
        bookingId: matchingBooking._id,
      });
      continue;
    }

    // Otherwise free
    slots.push({
      startTime: slotStartStr,
      endTime: slotEndStr,
      state: 'free',
    });
  }

  return {
    resource,
    date: dateStr,
    slots,
  };
}

export async function createResource(data) {
  return Resource.create(data);
}

export async function updateResource(id, data) {
  const resource = await Resource.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!resource) {
    throw ApiError.notFound('Resource not found', 'RESOURCE_NOT_FOUND');
  }
  return resource;
}

export async function deactivateResource(id) {
  const resource = await Resource.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!resource) {
    throw ApiError.notFound('Resource not found', 'RESOURCE_NOT_FOUND');
  }
  return resource;
}
