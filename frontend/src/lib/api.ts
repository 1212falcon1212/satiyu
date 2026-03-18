import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { useCustomerAuthStore } from '@/store/customer-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const BASE_URL = API_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Ensure CSRF cookie is set before mutating requests
let csrfReady = false;
async function ensureCsrf() {
  if (csrfReady) return;
  try {
    await axios.get(`${BASE_URL}/sanctum/csrf-cookie`, { withCredentials: true });
    csrfReady = true;
  } catch {
    // CSRF fetch failed — reset so next request retries
    csrfReady = false;
  }
}

api.interceptors.request.use(async (config) => {
  // Get CSRF cookie for state-changing requests
  const method = config.method?.toLowerCase();
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    await ensureCsrf();
  }

  // Skip if Authorization is already set (e.g. by customer-auth store)
  if (config.headers.Authorization) {
    return config;
  }
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track if we are already redirecting to prevent loops
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // On 419 (CSRF token mismatch) — refresh CSRF and retry once
    if (error.response?.status === 419 && !originalRequest._csrfRetried) {
      originalRequest._csrfRetried = true;
      csrfReady = false;
      await ensureCsrf();
      return api(originalRequest);
    }

    // On 401 — only redirect if not already doing so and not an auth-check request
    if (error.response?.status === 401 && typeof window !== 'undefined' && !isRedirecting) {
      const url = originalRequest?.url || '';
      // Skip auto-logout for auth verification endpoints (checkAuth, me)
      const isAuthCheck = url.includes('/auth/me') || url.includes('/auth/check');
      if (!isAuthCheck) {
        isRedirecting = true;
        const path = window.location.pathname;
        if (path.startsWith('/admin')) {
          useAuthStore.getState().logout();
          window.location.href = '/admin/login';
        } else if (useCustomerAuthStore.getState().token) {
          useCustomerAuthStore.getState().logout();
          window.location.href = '/giris';
        }
        // Reset after a short delay to allow the redirect
        setTimeout(() => { isRedirecting = false; }, 2000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
