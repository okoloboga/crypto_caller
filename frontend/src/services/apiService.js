import axios from 'axios';

// Создаем экземпляр Axios с базовым URL
const api = axios.create({
  baseURL: process.env.API_URL,
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

// Функция для получения пользователя по Wallet Address
export const getUserByWalletAddress = async (walletAddress) => {
  const response = await api.get(`/user/${walletAddress}`);
  return response.data; // возвращает объект User
};

// Функция для проверки подписки
export const checkSubscription = async (walletAddress) => {
  return api.get('/user/subscription-status', {
    walletAddress
  });
};


export const createSubscription = async (walletAddress, phoneNumber) => {
  try {
    const response = await api.post('/user/subscription', {
      walletAddress,
      phoneNumber,
    });
    return response.data; // Возвращаем данные из ответа
  } catch (error) {
    console.error('Ошибка при создании подписки:', error);
    throw error; // Пробрасываем ошибку для обработки выше
  }
};

export const updatePhoneNumber = async (walletAddress, phoneNumber) => {
  try {
    const response = await api.patch(`/user/${walletAddress}/phone`, { phoneNumber });
    return response; // Возвращаем обновленные данные пользователя
  } catch (error) {
    console.error('Ошибка обновления номера телефона:', error.response?.data || error.message);
    throw error; // Бросаем ошибку для обработки на уровне компонента
  }
};

// Функция для получения списка заданий пользователя
export const getUserTasks = async (walletAddress) => {
  return api.get(`/task/${walletAddress}`);
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
