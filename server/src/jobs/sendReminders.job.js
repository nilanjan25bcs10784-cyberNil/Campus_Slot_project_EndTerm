import { Booking } from '../models/Booking.js';
import { createNotification } from '../services/notification.service.js';

export async function sendUpcomingReminders() {
  try {
    const now = new Date();
    // 30 to 35 minutes ahead
    const reminderWindowStart = new Date(now.getTime() + 25 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 35 * 60 * 1000);

    const upcomingBookings = await Booking.find({
      status: 'approved',
      reminderSent: false,
      startAt: { $gte: reminderWindowStart, $lte: reminderWindowEnd },
    }).populate('resource');

    let processedCount = 0;

    for (const b of upcomingBookings) {
      b.reminderSent = true;
      await b.save();

      await createNotification({
        userId: b.user,
        type: 'reminder',
        message: `Reminder: Your reservation for ${b.resource?.name || 'resource'} starts in 30 minutes (${b.date} at ${b.startTime}). Remember to check in on time!`,
        bookingId: b._id,
      });

      processedCount++;
    }

    console.log(`[Job:sendUpcomingReminders] Sent ${processedCount} upcoming booking reminders at ${now.toISOString()}`);
  } catch (err) {
    console.error(`[Job:sendUpcomingReminders Error] ${err.message}`);
  }
}
