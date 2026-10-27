import { api } from './client.js';

export async function getAdminBookings(params = {}) {
  const res = await api.get('/admin/bookings', { params });
  return res.data.data;
}

export async function approveBooking(id, note = '') {
  const res = await api.post(`/admin/bookings/${id}/approve`, { note });
  return res.data.data;
}

export async function rejectBooking(id, note) {
  const res = await api.post(`/admin/bookings/${id}/reject`, { note });
  return res.data.data;
}

export async function createBlockedWindow(data) {
  const res = await api.post('/admin/blocked-windows', data);
  return res.data.data;
}

export async function getAdminAnalytics() {
  const res = await api.get('/admin/analytics');
  return res.data.data;
}
