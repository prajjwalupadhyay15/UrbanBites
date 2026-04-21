import { apiClient } from './client';

const toPartnerApprovalItem = (item) => ({
  ...item,
  id: item?.id ?? item?.userId ?? null,
});

const toRestaurantApprovalItem = (item) => ({
  ...item,
  id: item?.id ?? item?.restaurantId ?? null,
});

const toPartnerApprovalPayload = (body = {}) => ({
  userId: body.userId ?? body.id,
  approved: body.approved,
  rejectionReason: body.rejectionReason,
});

const toRestaurantApprovalPayload = (body = {}) => ({
  restaurantId: body.restaurantId ?? body.id,
  approved: body.approved,
  rejectionReason: body.rejectionReason,
});

export const adminApi = {
  /** GET /api/v1/admin/dashboard → AdminDashboardResponse */
  getDashboard: async () => {
    const res = await apiClient.get('/api/v1/admin/dashboard');
    return res.data;
  },

  /** GET /api/v1/admin/users → List<AdminUserResponse> */
  getUsers: async () => {
    const res = await apiClient.get('/api/v1/admin/users');
    return res.data;
  },

  /** PATCH /api/v1/admin/users/{userId}/enabled?enabled=true|false */
  setUserEnabled: async (userId, enabled) => {
    const res = await apiClient.patch(`/api/v1/admin/users/${userId}/enabled`, null, {
      params: { enabled },
    });
    return res.data;
  },

  /** GET /api/v1/admin/restaurants → List<AdminRestaurantResponse> */
  getRestaurants: async () => {
    const res = await apiClient.get('/api/v1/admin/restaurants');
    return res.data;
  },

  /** PATCH /api/v1/admin/restaurants/{id}/active?active=true|false */
  setRestaurantActive: async (restaurantId, active) => {
    const res = await apiClient.patch(`/api/v1/admin/restaurants/${restaurantId}/active`, null, {
      params: { active },
    });
    return res.data;
  },

  /** GET /api/v1/admin/orders */
  getOrders: async () => {
    const res = await apiClient.get('/api/v1/admin/orders');
    return res.data;
  },

  /** GET /api/v1/admin/disputes?status= */
  getDisputes: async (status) => {
    const res = await apiClient.get('/api/v1/admin/disputes', {
      params: status ? { status } : {},
    });
    return res.data;
  },

  /** PATCH /api/v1/admin/disputes/{id}/status */
  updateDisputeStatus: async (disputeId, body) => {
    const res = await apiClient.patch(`/api/v1/admin/disputes/${disputeId}/status`, body);
    return res.data;
  },

  /** GET /api/v1/admin/coupon-campaigns */
  getCouponCampaigns: async () => {
    const res = await apiClient.get('/api/v1/admin/coupon-campaigns');
    return res.data;
  },

  /** POST /api/v1/admin/coupon-campaigns */
  createCouponCampaign: async (body) => {
    const res = await apiClient.post('/api/v1/admin/coupon-campaigns', body);
    return res.data;
  },

  /** PATCH /api/v1/admin/coupon-campaigns/{id}/active?active= */
  setCouponActive: async (campaignId, active) => {
    const res = await apiClient.patch(`/api/v1/admin/coupon-campaigns/${campaignId}/active`, null, {
      params: { active },
    });
    return res.data;
  },

  /** GET /api/v1/admin/refunds */
  getRefunds: async () => {
    const res = await apiClient.get('/api/v1/admin/refunds');
    return res.data;
  },

  /** GET /api/v1/admin/finance/overview */
  getFinanceOverview: async () => {
    const res = await apiClient.get('/api/v1/admin/finance/overview');
    return res.data;
  },

  /** GET /api/v1/admin/pricing-rules */
  getPricingRules: async () => {
    const res = await apiClient.get('/api/v1/admin/pricing-rules');
    return res.data;
  },

  /** POST /api/v1/admin/pricing-rules */
  createPricingRule: async (body) => {
    const res = await apiClient.post('/api/v1/admin/pricing-rules', body);
    return res.data;
  },

  /** PATCH /api/v1/admin/pricing-rules/{pricingRuleId} */
  updatePricingRule: async (pricingRuleId, body) => {
    const res = await apiClient.patch(`/api/v1/admin/pricing-rules/${pricingRuleId}`, body);
    return res.data;
  },

  /** PATCH /api/v1/admin/pricing-rules/{pricingRuleId}/activate */
  activatePricingRule: async (pricingRuleId) => {
    const res = await apiClient.patch(`/api/v1/admin/pricing-rules/${pricingRuleId}/activate`);
    return res.data;
  },

  /** GET /api/v1/admin/dispatch/no-agent */
  getUnassignedDispatch: async () => {
    const res = await apiClient.get('/api/v1/admin/dispatch/no-agent');
    return res.data;
  },

  /** GET /api/v1/admin/payout-controls */
  getPayoutControls: async () => {
    const res = await apiClient.get('/api/v1/admin/payout-controls');
    return res.data;
  },

  /** PATCH /api/v1/admin/restaurants/{restaurantId}/payout-block */
  setPayoutBlock: async (restaurantId, body) => {
    const res = await apiClient.patch(`/api/v1/admin/restaurants/${restaurantId}/payout-block`, body);
    return res.data;
  },

  /** GET /api/v1/admin/review-moderations */
  getReviewModerations: async (params) => {
    const res = await apiClient.get('/api/v1/admin/review-moderations', { params });
    return res.data;
  },

  /** POST /api/v1/admin/review-moderations */
  moderateReview: async (body) => {
    const res = await apiClient.post('/api/v1/admin/review-moderations', body);
    return res.data;
  },

  /** GET /api/v1/admin/approvals/pending/partners */
  getPendingPartnerApprovals: async () => {
    const res = await apiClient.get('/api/v1/admin/approvals/pending/partners');
    return Array.isArray(res.data) ? res.data.map(toPartnerApprovalItem) : [];
  },

  /** GET /api/v1/admin/approvals/pending/restaurants */
  getPendingRestaurantApprovals: async () => {
    const res = await apiClient.get('/api/v1/admin/approvals/pending/restaurants');
    return Array.isArray(res.data) ? res.data.map(toRestaurantApprovalItem) : [];
  },

  /** GET /api/v1/admin/approvals/pending/delivery-agents */
  getPendingDeliveryAgentApprovals: async () => {
    const res = await apiClient.get('/api/v1/admin/approvals/pending/delivery-agents');
    return Array.isArray(res.data) ? res.data.map(toPartnerApprovalItem) : [];
  },

  /** POST /api/v1/admin/approvals/partners */
  approvePartner: async (body) => {
    const res = await apiClient.post('/api/v1/admin/approvals/partners', toPartnerApprovalPayload(body));
    return res.data;
  },

  /** POST /api/v1/admin/approvals/restaurants */
  approveRestaurant: async (body) => {
    const res = await apiClient.post('/api/v1/admin/approvals/restaurants', toRestaurantApprovalPayload(body));
    return res.data;
  },

  /** POST /api/v1/admin/approvals/delivery-agents */
  approveDeliveryAgent: async (body) => {
    const res = await apiClient.post('/api/v1/admin/approvals/delivery-agents', toPartnerApprovalPayload(body));
    return res.data;
  },

  /** POST /api/v1/admin/disputes */
  createDispute: async (body) => {
    const res = await apiClient.post('/api/v1/admin/disputes', body);
    return res.data;
  },
};
