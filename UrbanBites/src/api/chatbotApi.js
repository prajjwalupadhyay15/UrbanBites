import { apiClient } from './client';

export const chatbotApi = {
  sendMessage: async (message, chatHistory = null, orderId = null, imageUrl = null) => {
    const payload = { message };
    if (chatHistory) {
      payload.chatHistory = chatHistory;
    }
    if (orderId) {
      payload.orderId = orderId;
    }
    if (imageUrl) {
      payload.imageUrl = imageUrl;
    }
    const response = await apiClient.post('/api/v1/chatbot/message', payload);
    return response.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/api/v1/chatbot/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
