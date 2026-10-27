import { Notification } from '../models/Notification.js';

export async function createNotification({ userId, type, message, bookingId = null }) {
  return Notification.create({
    user: userId,
    type,
    message,
    bookingId,
    read: false,
  });
}

export async function getUserNotifications(userId) {
  return Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50);
}

export async function markNotificationAsRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
  return notification;
}

export async function markAllNotificationsAsRead(userId) {
  await Notification.updateMany({ user: userId, read: false }, { read: true });
  return { success: true };
}
