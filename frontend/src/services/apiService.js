import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Ошибка API:', error.response?.data || error.message);
    throw error;
  }
);

export const fetchUserPoints = async () => {
  return api.get('/points');
};

export default api;
