import { apiClient } from './client';

export const trackingApi = {
  /**
   * GET /api/v1/tracking/orders/{orderId}/snapshot
   */
  getSnapshot: async (orderId) => {
    const res = await apiClient.get(`/api/v1/tracking/orders/${orderId}/snapshot`);
    return res.data;
  },

  /**
   * GET /api/v1/tracking/orders/{orderId}/timeline
   */
  getTimeline: async (orderId) => {
    const res = await apiClient.get(`/api/v1/tracking/orders/${orderId}/timeline`);
    return res.data;
  },
  
  /**
   * POST /api/v1/tracking/orders/{orderId}/ping
   */
  pingLocation: async (orderId, lat, lng) => {
    const res = await apiClient.post(`/api/v1/tracking/orders/${orderId}/ping`, { latitude: lat, longitude: lng });
    return res.data;
  },
};
