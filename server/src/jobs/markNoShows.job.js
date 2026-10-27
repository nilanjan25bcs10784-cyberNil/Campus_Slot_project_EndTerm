import { Booking } from '../models/Booking.js';
import { createNotification } from '../services/notification.service.js';

export async function markNoShows() {
  try {
    const now = new Date();
    // 15 minutes past startAt
    const cutoff = new Date(now.getTime() - 15 * 60 * 1000);

    const noShowBookings = await Booking.find({
      status: 'approved',
      startAt: { $lt: cutoff },
      checkedInAt: null,
    }).populate('resource');

    let processedCount = 0;

    for (const b of noShowBookings) {
      b.status = 'no_show';
      b.slotKeys = []; // slot is now freed from active unique constraint
      await b.save();

      await createNotification({
        userId: b.user,
        type: 'no_show',
        message: `Your booking for ${b.resource?.name || 'resource'} on ${b.date} (${b.startTime}) was marked as a No-Show because you did not check in within 15 minutes of start.`,
        bookingId: b._id,
      });

      processedCount++;
    }

    console.log(`[Job:markNoShows] Processed ${processedCount} no-show bookings at ${now.toISOString()}`);
  } catch (err) {
    console.error(`[Job:markNoShows Error] ${err.message}`);
  }
}
