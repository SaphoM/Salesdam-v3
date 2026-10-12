import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Base URL:
 *  - In development the Vite proxy forwards /api → http://localhost:5001/api,
 *    so a relative '/api' path is correct and keeps everything on the same
 *    origin (localhost:3000), which means cookies are sent automatically.
 *  - In production set VITE_API_URL=https://api.yourapp.com to hit the real
 *    backend directly; withCredentials is still required for cross-origin cookies.
 */
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // always send/receive the session cookie
});

api.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('admin_tenantId');
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.message;
    if (status === 401) {
      localStorage.removeItem('admin_tenantId');
      if (!window.location.pathname.includes('/login'))
        window.location.href = '/login';
    } else if (status === 403) {
      toast.error(msg || 'Access denied');
    } else if (status === 429) {
      toast.error('Too many requests, slow down');
    } else if (status >= 500) {
      toast.error(msg || 'Server error');
    }
    return Promise.reject(err);
  },
);

export default api;
