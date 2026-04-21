import { apiClient } from './client';



// ── DELIVERY AGENT endpoints (requires ROLE_DELIVERY_AGENT) ──────────────────

export const dispatchApi = {
  /** POST /api/v1/dispatch/agent/availability — update online/offline + location */
  updateAvailability: async ({ online, available, latitude, longitude }) => {
    const res = await apiClient.post('/api/v1/dispatch/agent/availability', {
      online,
      available,
      latitude,
      longitude,
    });
    return res.data;
  },

  /** GET /api/v1/dispatch/agent/assignments/current — get current active assignment */
  getCurrentAssignment: async () => {
    try {
      const res = await apiClient.get('/api/v1/dispatch/agent/assignments/current');
      return res.data;
    } catch (error) {
      console.warn("getCurrentAssignment error:", error?.response?.status, error?.response?.data);
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  /** GET /api/v1/dispatch/agent/assignments/current/details — detailed assignment view */
  getCurrentAssignmentDetails: async () => {
    try {
      const res = await apiClient.get('/api/v1/dispatch/agent/assignments/current/details');
      return res.data;
    } catch (error) {
      console.warn("getCurrentAssignmentDetails error:", error?.response?.status, error?.response?.data);
      if (error?.response?.status === 404 || error?.response?.status === 401) return null;
      throw error;
    }
  },

  /** GET /api/v1/dispatch/agent/orders/history — past completed/cancelled orders */
  getMyOrderHistory: async (page = 0, size = 20) => {
    try {
      const res = await apiClient.get('/api/v1/dispatch/agent/orders/history', { params: { page, size } });
      return res.data;
    } catch (error) {
      console.warn("getMyOrderHistory error:", error?.response?.status, error?.response?.data);
      if (error?.response?.status === 401 || error?.response?.status === 404) return [];
      throw error;
    }
  },

  /** GET /api/v1/dispatch/agent/finance/summary */
  getFinanceSummary: async () => {
    try {
      const res = await apiClient.get('/api/v1/dispatch/agent/finance/summary');
      return res.data;
    } catch (error) {
      console.warn("getFinanceSummary error:", error?.response?.status, error?.response?.data);
      if (error?.response?.status === 401 || error?.response?.status === 404) return null;
      throw error;
    }
  },

  /** GET /api/v1/dispatch/agent/finance/transactions */
  getFinanceTransactions: async (page = 0, size = 20) => {
    try {
      const res = await apiClient.get('/api/v1/dispatch/agent/finance/transactions', { params: { page, size } });
      return res.data;
    } catch (error) {
      console.warn("getFinanceTransactions error:", error?.response?.status, error?.response?.data);
      if (error?.response?.status === 401 || error?.response?.status === 404) return [];
      throw error;
    }
  },

  /** POST /api/v1/dispatch/orders/{orderId}/accept — accept delivery offer */
  acceptOffer: async (orderId) => {
    const res = await apiClient.post(`/api/v1/dispatch/orders/${orderId}/accept`, {}, { _skipAuthRedirect: true });
    return res.data;
  },

  /** POST /api/v1/dispatch/orders/{orderId}/reject — reject delivery offer */
  rejectOffer: async (orderId) => {
    const res = await apiClient.post(`/api/v1/dispatch/orders/${orderId}/reject`, {}, { _skipAuthRedirect: true });
    return res.data;
  },

  /** POST /api/v1/dispatch/orders/{orderId}/pickup — confirm food picked up */
  markPickedUp: async (orderId) => {
    const res = await apiClient.post(`/api/v1/dispatch/orders/${orderId}/pickup`, {}, { _skipAuthRedirect: true });
    return res.data;
  },

  /** POST /api/v1/dispatch/orders/{orderId}/delivered — confirm delivery complete */
  markDelivered: async (orderId) => {
    const res = await apiClient.post(`/api/v1/dispatch/orders/${orderId}/delivered`, {}, { _skipAuthRedirect: true });
    return res.data;
  },
};

// ── ADMIN dispatch endpoints (requires ROLE_ADMIN) ───────────────────────────

export const adminDispatchApi = {
  /** POST /api/v1/dispatch/admin/process-timeouts */
  processTimeouts: async () => {
    const res = await apiClient.post('/api/v1/dispatch/admin/process-timeouts');
    return res.data;
  },

  /** GET /api/v1/dispatch/admin/orders/{orderId}/timeline */
  getOrderTimeline: async (orderId) => {
    const res = await apiClient.get(`/api/v1/dispatch/admin/orders/${orderId}/timeline`);
    return res.data;
  },

  /** GET /api/v1/dispatch/admin/no-agent-queue */
  getNoAgentQueue: async () => {
    const res = await apiClient.get('/api/v1/dispatch/admin/no-agent-queue');
    return res.data;
  },

  /** GET /api/v1/dispatch/admin/metrics?sinceMinutes=60 */
  getMetrics: async (sinceMinutes = 60) => {
    const res = await apiClient.get('/api/v1/dispatch/admin/metrics', {
      params: { sinceMinutes },
    });
    return res.data;
  },
};
