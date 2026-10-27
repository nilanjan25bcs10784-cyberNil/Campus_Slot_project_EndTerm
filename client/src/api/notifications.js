import { api } from './client.js';

export async function getNotifications() {
  const res = await api.get('/notifications');
  return res.data.data;
}

export async function markNotificationAsRead(id) {
  const res = await api.post(`/notifications/${id}/read`);
  return res.data.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.post('/notifications/read-all');
  return res.data.data;
}
