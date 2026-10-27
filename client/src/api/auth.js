import { api } from './client.js';

export async function register(data) {
  const res = await api.post('/auth/register', data);
  return res.data.data;
}

export async function login(credentials) {
  const res = await api.post('/auth/login', credentials);
  return res.data.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data.data.user;
}
