import { api } from './client.js';

export async function createBooking(data) {
  const res = await api.post('/bookings', data);
  return res.data.data;
}

export async function getMyBookings() {
  const res = await api.get('/bookings/mine');
  return res.data.data;
}

export async function getBookingById(id) {
  const res = await api.get(`/bookings/${id}`);
  return res.data.data;
}

export async function cancelBooking(id, reason = '') {
  const res = await api.post(`/bookings/${id}/cancel`, { reason });
  return res.data.data;
}

export async function checkInBooking(id) {
  const res = await api.post(`/bookings/${id}/check-in`);
  return res.data.data;
}
