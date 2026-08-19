import axios from 'axios';

const BASE_URL = 'http://localhost:8081/api/v1/wallet';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const walletApi = {
  getBalance: async () => {
    const res = await axios.get(`${BASE_URL}/balance`, getAuthHeaders());
    return res.data;
  },
  
  getHistory: async () => {
    const res = await axios.get(`${BASE_URL}/history`, getAuthHeaders());
    return res.data;
  },

  withdraw: async (data) => {
    const res = await axios.post(`${BASE_URL}/withdraw`, data, getAuthHeaders());
    return res.data;
  },

  getWithdrawals: async () => {
    const res = await axios.get(`${BASE_URL}/withdrawals`, getAuthHeaders());
    return res.data;
  }
};
