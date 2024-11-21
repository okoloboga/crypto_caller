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

// Функция для получения пользователя по Wallet Address
export const getUserByWalletAddress = async (walletAddress) => {
  console.log(`Получение данных пользователя для walletAddress: ${walletAddress}`);
  try {
    const response = await api.get(`/user/${walletAddress}`);
    console.log('Данные пользователя успешно получены:', response.data);
    return response.data; // возвращает объект User
  } catch (error) {
    console.error(`Ошибка при получении данных пользователя для walletAddress ${walletAddress}:`, error.message);
    throw error; // Пробрасываем ошибку для обработки на уровне вызова
  }
};

// Функция для проверки подписки
export const checkSubscription = async (walletAddress) => {
  console.log(`Проверка статуса подписки для walletAddress: ${walletAddress}`);
  try {
    const response = await api.get('/user/subscription-status', {
      params: { walletAddress }, // Используем params для передачи walletAddress
    });
    console.log('Статус подписки успешно проверен:', response.data);
    return response.data; // возвращает объект { isActive: boolean }
  } catch (error) {
    console.error(`Ошибка при проверке подписки для walletAddress ${walletAddress}:`, error.message);
    throw error; // Пробрасываем ошибку для обработки на уровне вызова
  }
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
  console.log(`Получение списка заданий для walletAddress: ${walletAddress}`);
  try {
    const response = await api.get(`/task/${walletAddress}`);
    console.log('Список заданий успешно получен:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при получении заданий для walletAddress ${walletAddress}:`, error.message);
    throw error; // Пробрасываем ошибку для обработки на уровне вызова
  }
};

// Функция для создания нового задания
export const createTask = async (taskData) => {
  console.log('Создание нового задания с данными:', taskData);
  try {
    const response = await api.post('/task', taskData);
    console.log('Задание успешно создано:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании задания:', error.message);
    throw error;
  }
};

// Функция для обновления существующего задания
export const updateTask = async (taskId, updates) => {
  console.log(`Обновление задания с ID ${taskId}. Обновляемые данные:`, updates);
  try {
    const response = await api.patch(`/task/${taskId}`, updates);
    console.log('Задание успешно обновлено:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при обновлении задания с ID ${taskId}:`, error.message);
    throw error;
  }
};

// Функция для удаления задания
export const deleteTask = async (taskId) => {
  console.log(`Удаление задания с ID ${taskId}`);
  try {
    const response = await api.delete(`/task/${taskId}`);
    console.log(`Задание с ID ${taskId} успешно удалено.`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при удалении задания с ID ${taskId}:`, error.message);
    throw error;
  }
};

export default api;
