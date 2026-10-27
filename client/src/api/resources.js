import { api } from './client.js';

export async function getResources(params = {}) {
  const res = await api.get('/resources', { params });
  return res.data.data;
}

export async function getResourceById(id) {
  const res = await api.get(`/resources/${id}`);
  return res.data.data;
}

export async function getResourceAvailability(id, date) {
  const res = await api.get(`/resources/${id}/availability`, {
    params: { date },
  });
  return res.data.data;
}

export async function createResource(data) {
  const res = await api.post('/resources', data);
  return res.data.data;
}

export async function updateResource(id, data) {
  const res = await api.put(`/resources/${id}`, data);
  return res.data.data;
}

export async function deleteResource(id) {
  const res = await api.delete(`/resources/${id}`);
  return res.data.data;
}
