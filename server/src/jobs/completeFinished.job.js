import { Booking } from '../models/Booking.js';

export async function completeFinishedBookings() {
  try {
    const now = new Date();

    const finishedBookings = await Booking.find({
      status: 'approved',
      checkedInAt: { $ne: null },
      endAt: { $lt: now },
    });

    let processedCount = 0;

    for (const b of finishedBookings) {
      b.status = 'completed';
      b.slotKeys = []; // clears slotKeys
      await b.save();
      processedCount++;
    }

    console.log(`[Job:completeFinishedBookings] Marked ${processedCount} finished bookings as completed at ${now.toISOString()}`);
  } catch (err) {
    console.error(`[Job:completeFinishedBookings Error] ${err.message}`);
  }
}
