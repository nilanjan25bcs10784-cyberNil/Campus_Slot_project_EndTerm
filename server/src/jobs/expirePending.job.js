import { Booking } from '../models/Booking.js';
import { createNotification } from '../services/notification.service.js';
import { processWaitlistPromotion } from '../services/waitlist.service.js';

export async function expirePendingBookings() {
  try {
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: 'pending',
      expiresAt: { $ne: null, $lt: now },
    }).populate('resource');

    let processedCount = 0;

    for (const b of expiredBookings) {
      b.status = 'rejected';
      b.decisionNote = 'Expired: Faculty did not review request within 24 hours';
      b.slotKeys = [];
      await b.save();

      await createNotification({
        userId: b.user,
        type: 'booking_rejected',
        message: `Your booking request for ${b.resource?.name || 'resource'} on ${b.date} has expired as it was not reviewed within 24 hours.`,
        bookingId: b._id,
      });

      // Free slot: trigger waitlist promotion
      await processWaitlistPromotion(b.resource?._id || b.resource, b.date);
      processedCount++;
    }

    console.log(`[Job:expirePendingBookings] Processed ${processedCount} expired pending bookings at ${now.toISOString()}`);
  } catch (err) {
    console.error(`[Job:expirePendingBookings Error] ${err.message}`);
  }
}
