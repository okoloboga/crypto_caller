import axios from 'axios';

// Create an Axios instance with the base URL
const api = axios.create({
  baseURL: process.env.API_URL || 'https://caller.ruble.website/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle API response errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Function to get user data by Wallet Address
export const getUserByWalletAddress = async (walletAddress) => {
  console.log(`Fetching user data for walletAddress: ${walletAddress}`);
  try {
    console.log(api.defaults.baseURL);
    const response = await api.get(`/user/${walletAddress}`);
    console.log('User data successfully fetched:', response);

    return response;
  } catch (error) {
    console.error(`Error fetching user data for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

// Функция для обновления очков
export const updatePoints = async (walletAddress, newPoints) => {
  try {
    console.log(`Updating points for walletAddress: ${walletAddress} with newPoints: ${newPoints}`);
    // Передаем и walletAddress, и newPoints
    const response = await api.post('/user/update-points', { walletAddress, newPoints });
    console.log('Points successfully updated:', response); // Ответ с обновленными очками
    return response; // Возвращаем обновленные очки
  } catch (error) {
    console.error(`Error updating points for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

// Функция для сбора очков
export const claimPoints = async (walletAddress, points) => {
  try {
    console.log(`Claiming points for walletAddress: ${walletAddress} with points: ${points}`);
    // Отправляем запрос на сервер для сбора очков
    const response = await api.post('/user/claim-points', { walletAddress, points });
    console.log('Points successfully claimed and added to the user account:', response);
    return response; // Возвращаем подтверждение успешного сбора
  } catch (error) {
    console.error(`Error claiming points for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

// Function to check subscription status
export const checkSubscription = async (walletAddress) => {
  console.log(`Checking subscription status for walletAddress: ${walletAddress}`);
  try {
    const response = await api.get('/user/subscription-status', {
      params: { walletAddress },
    });
    console.log('Subscription status successfully checked:', response);
    return response; 
  } catch (error) {
    console.error(`Error checking subscription for walletAddress ${walletAddress}:`, error.message);
    throw error; 
  }
};

// Function to create a subscription
export const createSubscription = async (walletAddress, phoneNumber, signedChallenge) => {
  console.log(`Creating subscription for walletAddress: ${walletAddress}`);
  try {
    const response = await api.post('/user/subscription', {
      walletAddress,
      phoneNumber,
      signedChallenge,
    });
    console.log('Subscription successfully created:', response);
    return response;
  } catch (error) {
    console.error(`Error creating subscription for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

export const updatePhoneNumber = async (walletAddress, phoneNumber) => {
  try {
    const response = await api.patch(`/user/${walletAddress}/phone`, { phoneNumber });
    return response;
  } catch (error) {
    console.error('Error updating phone number:', error.response?.data || error.message);
    throw error;
  }
};

// Function to get a user's task list
export const getUserTasks = async (walletAddress) => {
  console.log(`Fetching task list for walletAddress: ${walletAddress}`);
  try {
    const response = await api.get(`/task/user/${walletAddress}`);
    console.log('Task list successfully fetched:', response);
    return response;
  } catch (error) {
    console.error(`Error fetching tasks for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

// Function to create a new task
export const createTask = async (taskData) => {
  console.log('Creating a new task with data:', taskData);
  try {
    const response = await api.post('/task', taskData);
    console.log('Task successfully created:', response);
    return response;
  } catch (error) {
    console.error('Error creating task:', error.message);
    throw error;
  }
};

// Function to update an existing task
export const updateTask = async (taskId, updates) => {
  console.log(`Updating task with ID ${taskId}. Updated data:`, updates);
  try {
    const response = await api.patch(`/task/${taskId}`, updates);
    console.log('Task successfully updated:', response);
    return response;
  } catch (error) {
    console.error(`Error updating task with ID ${taskId}:`, error.message);
    throw error;
  }
};

// Function to delete a task
export const deleteTask = async (taskId) => {
  console.log(`Deleting task with ID ${taskId}`);
  try {
    const response = await api.delete(`/task/${taskId}`);
    console.log(`Task with ID ${taskId} successfully deleted.`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting task with ID ${taskId}:`, error.message);
    throw error;
  }
};

// Function to generate a challenge
export const getChallenge = async (walletAddress) => {
  try {
    const response = await api.get('/challenge/generate', {
      params: { walletAddress },
    });

    console.log('Full response from server:', response);

    // Access challenge in response.data
    if (!response.challenge) {
      throw new Error('Invalid response structure from server.');
    }

    return response.challenge;
  } catch (error) {
    console.error(`Error requesting challenge for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

// Function to verify a challenge
export const verifyChallenge = async (account, tonProof) => {
  try {
    const response = await api.post('/challenge/verify', {
      account,
      tonProof
    });

    if (response && response.valid !== undefined) {
      console.log(response.valid); // Checking access to valid
    } else {
      console.log('Full response from server:', response);
    }

    return response.valid;
  } catch (error) {
    console.error(`Error verifying challenge for account.address ${account.address}:`, error.message);
    throw error;
  }
};
