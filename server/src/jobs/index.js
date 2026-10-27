import cron from 'node-cron';
import { expirePendingBookings } from './expirePending.job.js';
import { markNoShows } from './markNoShows.job.js';
import { completeFinishedBookings } from './completeFinished.job.js';
import { sendUpcomingReminders } from './sendReminders.job.js';

let cronTask = null;

export function startBackgroundJobs() {
  if (cronTask) return cronTask;

  // Run every minute: '* * * * *'
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      await expirePendingBookings();
    } catch (e) {
      console.error('[Cron Error] expirePendingBookings:', e.message);
    }

    try {
      await markNoShows();
    } catch (e) {
      console.error('[Cron Error] markNoShows:', e.message);
    }

    try {
      await completeFinishedBookings();
    } catch (e) {
      console.error('[Cron Error] completeFinishedBookings:', e.message);
    }

    try {
      await sendUpcomingReminders();
    } catch (e) {
      console.error('[Cron Error] sendUpcomingReminders:', e.message);
    }
  });

  console.log('[Background Jobs] Scheduled 4 recurring cron jobs (running every minute)');
  return cronTask;
}

export function stopBackgroundJobs() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[Background Jobs] Stopped recurring cron jobs');
  }
}
