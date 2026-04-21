import { apiClient } from './client';

export const cartApi = {
  /** GET /api/v1/cart — Returns CartResponse */
  getCart: async () => {
    const res = await apiClient.get('/api/v1/cart');
    return res.data;
  },

  /** POST /api/v1/cart/items — { menuItemId, quantity, notes? } → CartResponse */
  addItem: async (menuItemId, quantity = 1, notes = null) => {
    const res = await apiClient.post('/api/v1/cart/items', { menuItemId, quantity, notes });
    return res.data;
  },

  /** PUT /api/v1/cart/items/{itemId} — { quantity } → CartResponse */
  updateItem: async (cartItemId, quantity) => {
    const res = await apiClient.put(`/api/v1/cart/items/${cartItemId}`, { quantity });
    return res.data;
  },

  /** DELETE /api/v1/cart/items/{itemId} */
  removeItem: async (cartItemId) => {
    const res = await apiClient.delete(`/api/v1/cart/items/${cartItemId}`);
    return res.data;
  },

  /** DELETE /api/v1/cart/clear */
  clearCart: async () => {
    const res = await apiClient.delete('/api/v1/cart/clear');
    return res.data;
  },

  /** POST /api/v1/cart/checkout-preview → CheckoutPreviewResponse */
  checkoutPreview: async () => {
    const res = await apiClient.post('/api/v1/cart/checkout-preview', {});
    return res.data;
  },
};
