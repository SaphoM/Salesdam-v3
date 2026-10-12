import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Base URL:
 *  - In development the Vite proxy forwards /api → http://localhost:5001/api,
 *    so a relative '/api' path is correct and keeps everything on the same
 *    origin (localhost:3000), which means cookies are sent automatically.
 *  - In production set VITE_API_URL=https://api.yourapp.com to hit the real
 *    backend directly; withCredentials is still required for cross-origin cookies.
 *  - API versioning is included in the base URL (e.g., /api/v1)
 */
const API_VERSION = 'v1';
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/${API_VERSION}`
  : `/api/${API_VERSION}`;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // always send/receive the session cookie
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request interceptor ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Attach the active tenant so the backend can scope queries.
    // The value is set in localStorage immediately after login/register.
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Something went wrong';

    if (status === 401) {
      // Session cookie missing, expired, or invalid — send to login.
      // Guard against redirect loops on the auth pages themselves.
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register') && !path.startsWith('/forgot-password') && !path.startsWith('/reset-password') && !path.startsWith('/auth/verify') && !path.startsWith('/auth/payment') && !path.startsWith('/verify-email') && !path.startsWith('/payment-callback') && !path.startsWith('/payment/callback')) {
        localStorage.removeItem('tenantId');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error('Access denied. You do not have permission to do that.');
    } else if (status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject({ message, status, data: error.response?.data });
  }
);

export default api;
