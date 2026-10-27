import { api } from './client.js';

export async function joinWaitlist(data) {
  const res = await api.post('/waitlist', data);
  return res.data.data;
}

export async function getMyWaitlist() {
  const res = await api.get('/waitlist/mine');
  return res.data.data;
}

export async function cancelWaitlist(id) {
  const res = await api.delete(`/waitlist/${id}`);
  return res.data.data;
}
