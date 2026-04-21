import { apiClient } from './client';
import { v4 as uuidv4 } from 'uuid';

// ── CUSTOMER endpoints (requires ROLE_CUSTOMER) ─────────────────────────────

export const customerOrderApi = {
  /** POST /api/v1/orders — place order from current cart */
  placeOrder: async (data = {}) => {
    const res = await apiClient.post('/api/v1/orders', data);
    return res.data;
  },

  /** GET /api/v1/orders — list my orders */
  listMyOrders: async () => {
    const res = await apiClient.get('/api/v1/orders');
    return res.data;
  },

  /** GET /api/v1/orders/{orderId} */
  getMyOrder: async (orderId) => {
    const res = await apiClient.get(`/api/v1/orders/${orderId}`);
    return res.data;
  },

  /** POST /api/v1/orders/{orderId}/cancel */
  cancelMyOrder: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/${orderId}/cancel`);
    return res.data;
  },

  /** POST /api/v1/orders/{orderId}/payment/intent — create Razorpay order */
  createPaymentIntent: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/${orderId}/payment/intent`, {
      idempotencyKey: uuidv4(),
    });
    return res.data;
  },

  /** POST /api/v1/orders/{orderId}/payment/simulate-success (DEV ONLY) */
  simulatePaymentSuccess: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/${orderId}/payment/simulate-success`, {
      idempotencyKey: uuidv4(),
    });
    return res.data;
  },

  /** POST /api/v1/orders/{orderId}/payment/simulate-failure (DEV ONLY) */
  simulatePaymentFailure: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/${orderId}/payment/simulate-failure`, {
      idempotencyKey: uuidv4(),
    });
    return res.data;
  },
};

// ── OWNER endpoints (requires ROLE_RESTAURANT_OWNER) ────────────────────────

export const ownerOrderApi = {
  /** GET /api/v1/orders/owner — all orders across owner's restaurants */
  listOwnerOrders: async () => {
    const res = await apiClient.get('/api/v1/orders/owner');
    return res.data;
  },

  /** GET /api/v1/orders/owner/finance/summary */
  getFinanceSummary: async () => {
    const res = await apiClient.get('/api/v1/orders/owner/finance/summary');
    return res.data;
  },

  /** GET /api/v1/orders/owner/finance/transactions */
  getFinanceTransactions: async () => {
    const res = await apiClient.get('/api/v1/orders/owner/finance/transactions');
    return res.data;
  },

  /** GET /api/v1/orders/owner/restaurants/{restaurantId} */
  listRestaurantOrders: async (restaurantId) => {
    const res = await apiClient.get(`/api/v1/orders/owner/restaurants/${restaurantId}`);
    return res.data;
  },

  /** POST /api/v1/orders/owner/{orderId}/accept */
  markAcceptedByRestaurant: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/owner/${orderId}/accept`);
    return res.data;
  },

  /** POST /api/v1/orders/owner/{orderId}/preparing */
  markPreparing: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/owner/${orderId}/preparing`);
    return res.data;
  },

  /** POST /api/v1/orders/owner/{orderId}/ready-for-pickup */
  markReadyForPickup: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/owner/${orderId}/ready-for-pickup`);
    return res.data;
  },

  /** POST /api/v1/orders/owner/{orderId}/cancel */
  cancelOwnerOrder: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/owner/${orderId}/cancel`);
    return res.data;
  },
};

// ── DELIVERY AGENT endpoints (requires ROLE_DELIVERY_AGENT) ──────────────────

export const deliveryOrderApi = {
  /** POST /api/v1/orders/delivery/{orderId}/pickup */
  markOutForDelivery: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/delivery/${orderId}/pickup`, {}, { _skipAuthRedirect: true });
    return res.data;
  },

  /** POST /api/v1/orders/delivery/{orderId}/delivered */
  markDelivered: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/delivery/${orderId}/delivered`, {}, { _skipAuthRedirect: true });
    return res.data;
  },
};

// ── ADMIN endpoints (requires ROLE_ADMIN) ────────────────────────────────────

export const adminOrderApi = {
  /** GET /api/v1/orders/admin */
  listAllOrders: async () => {
    const res = await apiClient.get('/api/v1/orders/admin');
    return res.data;
  },

  /** POST /api/v1/orders/admin/{orderId}/cancel */
  cancelAdminOrder: async (orderId) => {
    const res = await apiClient.post(`/api/v1/orders/admin/${orderId}/cancel`);
    return res.data;
  },

  /** POST /api/v1/orders/admin/{orderId}/payment/refund (multipart form data) */
  refundOrder: async (orderId, { amount, reason, evidenceImage }) => {
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('idempotencyKey', crypto.randomUUID());
    formData.append('reason', reason);
    if (evidenceImage) formData.append('evidenceImage', evidenceImage);
    const res = await apiClient.post(`/api/v1/orders/admin/${orderId}/payment/refund`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
};
