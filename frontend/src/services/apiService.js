import axios from 'axios';

// Создаем экземпляр Axios с базовым URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api', // URL бекенда, замените на ваш
  headers: {
    'Content-Type': 'application/json',
  },
});

// Обработка ошибок ответа API
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Ошибка API:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Функция для получения очков пользователя
export const fetchUserPoints = async () => {
  return api.get('/points');
};

// Функция для проверки подписки
export const checkSubscription = async () => {
  return api.get('/subscription/status');
};

// Функция для создания подписки
export const createSubscription = async (phoneNumber) => {
  return api.post('/subscription', { phoneNumber });
};

// Функция для получения списка заданий пользователя
export const getUserTasks = async () => {
  return api.get('/task');
};

// Функция для создания нового задания
export const createTask = async (taskData) => {
  return api.post('/task', taskData);
};

// Функция для обновления существующего задания
export const updateTask = async (taskId, updates) => {
  return api.patch(`/task/${taskId}`, updates);
};

// Функция для удаления задания
export const deleteTask = async (taskId) => {
  return api.delete(`/task/${taskId}`);
};

export default api;
