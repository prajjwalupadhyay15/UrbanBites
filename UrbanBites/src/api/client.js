import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Guard flag to prevent recursive 401 cascades ─────────────────────────────
let _isHandling401 = false;

// Response interceptor: auto-logout on 401 (expired/invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !_isHandling401) {

      // ── Per-request opt-out: callers can set _skipAuthRedirect to handle
      //    401 errors locally without triggering a global logout + redirect.
      //    Used by dashboard queries that might fail transiently.
      if (error.config?._skipAuthRedirect) {
        return Promise.reject(error);
      }

      const currentPath = window.location.pathname;
      // Don't redirect on auth pages or during checkout/payment flow
      const skipRedirectPaths = ['/login', '/register', '/partner/restaurant/register', '/partner/delivery/register', '/checkout'];
      const shouldSkip = skipRedirectPaths.some(p => currentPath.startsWith(p));

      if (!shouldSkip) {
        _isHandling401 = true;

        // Log persistently so info survives the page reload
        const debugInfo = {
          url: error.config?.url,
          method: error.config?.method,
          timestamp: new Date().toISOString(),
          response: error.response?.data,
        };
        console.error('⚡ 401 Unauthorized — forcing logout.', debugInfo);
        try { sessionStorage.setItem('__ub_last_401', JSON.stringify(debugInfo)); } catch (_) {}

        // ── Synchronous state clear (NO API call, no cascade) ────────────
        localStorage.removeItem('token');
        try {
          localStorage.removeItem('auth-storage');
        } catch (_) {}

        // Also reset the in-memory zustand store if it's loaded
        import('../store/authStore').then(({ useAuthStore }) => {
          useAuthStore.setState({
            user: null,
            role: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }).catch(() => {});

        const redirectPath = currentPath + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
      }
    }
    return Promise.reject(error);
  }
);
