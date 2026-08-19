import { apiClient } from './client';

export const reviewApi = {
  /** POST /api/v1/orders/{orderId}/review — { rating, comment } → ReviewResponse */
  submitReview: async (orderId, rating, comment = '') => {
    const res = await apiClient.post(`/api/v1/orders/${orderId}/review`, { rating, comment });
    return res.data;
  },

  /** POST /api/v1/restaurants/{restaurantId}/menu/{menuItemId}/reviews */
  submitMenuItemReview: async (restaurantId, menuItemId, orderId, rating, comment = '') => {
    const res = await apiClient.post(`/api/v1/restaurants/${restaurantId}/menu/${menuItemId}/reviews`, { orderId, rating, comment });
    return res.data;
  },

  /** GET /api/v1/restaurants/{restaurantId}/reviews → List<ReviewResponse> */
  getRestaurantReviews: async (restaurantId) => {
    const res = await apiClient.get(`/api/v1/restaurants/${restaurantId}/reviews`);
    return res.data;
  },

  /** GET /api/v1/users/me/reviews → List<ReviewResponse> */
  getMyReviews: async () => {
    const res = await apiClient.get(`/api/v1/users/me/reviews`);
    return res.data;
  },

  /** POST /api/v1/owner/restaurants/{restaurantId}/reviews/{reviewId}/reply */
  replyToReview: async (restaurantId, reviewId, replyText) => {
    const res = await apiClient.post(`/api/v1/restaurants/me/${restaurantId}/reviews/${reviewId}/reply`, { reply: replyText });
    return res.data;
  },
};
