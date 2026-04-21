import { apiClient } from './client';

// ── ALL AUTHENTICATED USERS (any role) ───────────────────────────────────────

export const notificationApi = {
  /** GET /api/v1/notifications?page=&size= — list my notifications */
  list: async (page = 0, size = 20) => {
    const res = await apiClient.get('/api/v1/notifications', {
      params: { page, size },
    });
    return res.data;
  },

  /** GET /api/v1/notifications/unread-count */
  getUnreadCount: async () => {
    const res = await apiClient.get('/api/v1/notifications/unread-count');
    return res.data;
  },

  /** PATCH /api/v1/notifications/{notificationId}/read */
  markRead: async (notificationId) => {
    const res = await apiClient.patch(`/api/v1/notifications/${notificationId}/read`);
    return res.data;
  },

  /** PATCH /api/v1/notifications/read-all */
  markAllRead: async () => {
    const res = await apiClient.patch('/api/v1/notifications/read-all');
    return res.data;
  },

  /** POST /api/v1/notifications/admin/dlq/{jobId}/retry */
  retryDlqJob: async (jobId) => {
    const res = await apiClient.post(`/api/v1/notifications/admin/dlq/${jobId}/retry`);
    return res.data;
  },
};
