import axios from 'axios';

// Event listeners for cold start banner
const coldStartListeners = new Set();
export function subscribeColdStart(callback) {
  coldStartListeners.add(callback);
  return () => coldStartListeners.delete(callback);
}
function notifyColdStart(isCold) {
  coldStartListeners.forEach((cb) => cb(isCold));
}

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let pendingRequestsCount = 0;
let coldStartTimer = null;

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campusslot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    pendingRequestsCount++;
    if (pendingRequestsCount === 1) {
      coldStartTimer = setTimeout(() => {
        if (pendingRequestsCount > 0) {
          notifyColdStart(true);
        }
      }, 4000); // 4-second threshold
    }

    return config;
  },
  (error) => {
    pendingRequestsCount = Math.max(0, pendingRequestsCount - 1);
    if (pendingRequestsCount === 0 && coldStartTimer) {
      clearTimeout(coldStartTimer);
      notifyColdStart(false);
    }
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    pendingRequestsCount = Math.max(0, pendingRequestsCount - 1);
    if (pendingRequestsCount === 0) {
      if (coldStartTimer) clearTimeout(coldStartTimer);
      notifyColdStart(false);
    }
    return response;
  },
  (error) => {
    pendingRequestsCount = Math.max(0, pendingRequestsCount - 1);
    if (pendingRequestsCount === 0) {
      if (coldStartTimer) clearTimeout(coldStartTimer);
      notifyColdStart(false);
    }

    // Auto-logout on 401 Unauthorized (unless logging in)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('campusslot_token');
      localStorage.removeItem('campusslot_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }

    return Promise.reject(error);
  }
);
