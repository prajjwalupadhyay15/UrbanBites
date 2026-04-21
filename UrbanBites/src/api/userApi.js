import { apiClient } from './client';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export const userApi = {
  /**
   * GET /api/v1/users/me
   * Returns: UserProfileResponse { id, fullName, email, phone, gender, profileImagePath, role, createdAt }
   */
  getProfile: async () => {
    const res = await apiClient.get('/api/v1/users/me');
    return res.data;
  },

  /**
   * PUT /api/v1/users/me (multipart/form-data)
   * Params: fullName, email, gender?, profileImage?
   * Returns: UserProfileResponse
   */
  updateProfile: async ({ fullName, email, gender, profileImage }) => {
    const fd = new FormData();
    fd.append('fullName', fullName);
    fd.append('email', email);
    if (gender) fd.append('gender', gender);
    if (profileImage) fd.append('profileImage', profileImage);
    const res = await apiClient.put('/api/v1/users/me', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * DELETE /api/v1/users/me
   */
  deleteProfile: async () => {
    const res = await apiClient.delete('/api/v1/users/me');
    return res.data;
  },

  /** Resolve a profileImagePath to a full URL */
  getAvatarUrl: (profileImagePath) => {
    if (!profileImagePath) return null;
    if (profileImagePath.startsWith('http')) return profileImagePath;
    return `${IMAGE_BASE}${profileImagePath}`;
  },

  /** PUT /api/v1/users/me/password */
  changePassword: async (data) => {
    const res = await apiClient.put('/api/v1/users/me/password', data);
    return res.data;
  },
};

export const addressApi = {
  /**
   * GET /api/v1/users/me/addresses
   * Returns: List<AddressResponse> { id, label, line1, line2, city, state, pincode, landmark, latitude, longitude, contactName, contactPhone, isDefault }
   */
  getAddresses: async () => {
    const res = await apiClient.get('/api/v1/users/me/addresses');
    return res.data;
  },

  /**
   * POST /api/v1/users/me/addresses (JSON body = CreateAddressRequest)
   * Fields: label, line1, line2, city, state, pincode, landmark, contactName, contactPhone, latitude, longitude
   */
  createAddress: async (body) => {
    const res = await apiClient.post('/api/v1/users/me/addresses', body);
    return res.data;
  },

  /**
   * PUT /api/v1/users/me/addresses/{addressId} (JSON body = UpdateAddressRequest)
   */
  updateAddress: async (addressId, body) => {
    const res = await apiClient.put(`/api/v1/users/me/addresses/${addressId}`, body);
    return res.data;
  },

  /**
   * DELETE /api/v1/users/me/addresses/{addressId}
   */
  deleteAddress: async (addressId) => {
    const res = await apiClient.delete(`/api/v1/users/me/addresses/${addressId}`);
    return res.data;
  },

  /**
   * PATCH /api/v1/users/me/addresses/{addressId}/default
   */
  setDefault: async (addressId) => {
    const res = await apiClient.patch(`/api/v1/users/me/addresses/${addressId}/default`);
    return res.data;
  },
};
