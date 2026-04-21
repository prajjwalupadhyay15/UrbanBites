import { apiClient } from './client';

export const authApi = {
  register: async (data) => {
    const response = await apiClient.post('/api/v1/auth/register', data);
    return response.data;
  },
  login: async (data) => {
    const response = await apiClient.post('/api/v1/auth/login', data);
    return response.data;
  },
  requestPhoneOtp: async (data) => {
    const response = await apiClient.post('/api/v1/auth/login/request-otp', data);
    return response.data;
  },
  verifyPhoneOtp: async (data) => {
    const response = await apiClient.post('/api/v1/auth/login/verify-otp', data);
    return response.data;
  },
  requestPasswordResetOtp: async (data) => {
    const response = await apiClient.post('/api/v1/auth/password-reset/request-otp', data);
    return response.data;
  },
  confirmPasswordReset: async (data) => {
    const response = await apiClient.post('/api/v1/auth/password-reset/confirm', data);
    return response.data;
  },
  requestEmailVerificationOtp: async () => {
    const response = await apiClient.post('/api/v1/auth/email-verification/request-otp');
    return response.data;
  },
  verifyEmailOtp: async (data) => {
    const response = await apiClient.post('/api/v1/auth/email-verification/verify-otp', data);
    return response.data;
  },
  logout: async (data = {}) => {
    const response = await apiClient.post('/api/v1/auth/logout', data);
    return response.data;
  },
};
