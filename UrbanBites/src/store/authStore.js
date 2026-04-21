import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/authApi';

// ── Moved OUTSIDE persist so it is never serialized to localStorage ─────────
export const getRoleRedirectPath = (role) => {
  switch (role) {
    case 'RESTAURANT_OWNER': return '/owner/dashboard';
    case 'DELIVERY_AGENT': return '/delivery/dashboard';
    case 'ADMIN': return '/admin/dashboard';
    case 'CUSTOMER':
    default: return '/';
  }
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Keep a reference on the store object for backward compat with existing callers
      // that do useAuthStore.getState().getRoleRedirectPath(...)
      getRoleRedirectPath,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          set({
            user: { email: response.email, fullName: response.fullName },
            role: response.role,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          localStorage.setItem('token', response.accessToken);
          return response;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          set({
            user: { email: response.email, fullName: response.fullName },
            role: response.role,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          localStorage.setItem('token', response.accessToken);
          return response;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (e) {
          console.error('Logout API failed, continuing client logout', e);
        } finally {
          localStorage.removeItem('token');
          // Clear cart so the next user doesn't see stale items
          const { useCartStore } = await import('./cartStore');
          useCartStore.getState().clearCart();
          set({
            user: null,
            role: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      // Exclude the function from serialization to prevent JSON stringify issues
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
