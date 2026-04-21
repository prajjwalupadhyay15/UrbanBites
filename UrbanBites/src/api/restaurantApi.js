import { apiClient } from './client';

export const restaurantApi = {
  /**
   * GET /api/v1/restaurants/discovery
   * Params: latitude, longitude, radiusKm
   */
  discover: async ({ latitude, longitude, radiusKm = 10 }) => {
    const res = await apiClient.get('/api/v1/restaurants/discovery', {
      params: { latitude, longitude, radiusKm },
    });
    return res.data;
  },

  /**
   * GET /api/v1/restaurants/{restaurantId}/menu  (public)
   */
  getPublicMenu: async (restaurantId) => {
    const res = await apiClient.get(`/api/v1/restaurants/${restaurantId}/menu`);
    return res.data;
  },

  /**
   * Fetch restaurant info by ID.
   * Requires backend to implement GET /api/v1/restaurants/{id}
   */
  getRestaurantInfo: async (restaurantId) => {
    try {
      const res = await apiClient.get(`/api/v1/restaurants/${restaurantId}`);
      return res.data;
    } catch {
      return null;
    }
  },

  // ── Owner authenticated endpoints ──────────────────────────────────────────

  getMyRestaurants: async () => {
    const res = await apiClient.get('/api/v1/restaurants/me');
    return res.data;
  },

  createMyRestaurant: async (formData) => {
    const res = await apiClient.post('/api/v1/restaurants/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updateMyRestaurant: async (restaurantId, formData) => {
    const res = await apiClient.put(`/api/v1/restaurants/me/${restaurantId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteMyRestaurant: async (restaurantId) => {
    const res = await apiClient.delete(`/api/v1/restaurants/me/${restaurantId}`);
    return res.data;
  },


  /**
   * GET /api/v1/restaurants/me/{restaurantId}/menu  (owner — includes unavailable items)
   */
  getOwnerMenu: async (restaurantId) => {
    const res = await apiClient.get(`/api/v1/restaurants/me/${restaurantId}/menu`);
    return res.data;
  },

  /**
   * POST /api/v1/restaurants/me/{restaurantId}/menu  (multipart)
   * Params: name, description?, price, veg, available, image (file)
   */
  createMenuItem: async (restaurantId, formData) => {
    const res = await apiClient.post(
      `/api/v1/restaurants/me/${restaurantId}/menu`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  /**
   * PUT /api/v1/restaurants/me/{restaurantId}/menu/{menuItemId}  (multipart)
   */
  updateMenuItem: async (restaurantId, menuItemId, formData) => {
    const res = await apiClient.put(
      `/api/v1/restaurants/me/${restaurantId}/menu/${menuItemId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  deleteMenuItem: async (restaurantId, menuItemId) => {
    const res = await apiClient.delete(`/api/v1/restaurants/me/${restaurantId}/menu/${menuItemId}`);
    return res.data;
  },

  // ── Zones ───────────────────────────────────────────────────────────────

  createServiceZone: async (zoneData) => {
    const res = await apiClient.post('/api/v1/restaurants/zones', zoneData);
    return res.data;
  },

  listZones: async () => {
    const res = await apiClient.get('/api/v1/restaurants/zones');
    return res.data;
  },

  assignZoneRule: async (restaurantId, serviceZoneId, ruleType) => {
    const res = await apiClient.post(`/api/v1/restaurants/me/${restaurantId}/zones`, {
      serviceZoneId,
      ruleType,
    });
    return res.data;
  },
};

