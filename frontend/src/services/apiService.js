import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL || 'https://caller.ruble.website/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

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

export const requestTokenWithdrawal = async (walletAddress, amount) => {
  console.log(`Requesting token withdrawal for walletAddress: ${walletAddress}, amount: ${amount}`);
  try {
    const response = await api.post('/withdrawal/send-tokens', {
      recipientAddress: walletAddress,
      amount: amount.toString(),
    });
    console.log('Token withdrawal successful:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error requesting token withdrawal for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

export const updatePoints = async (walletAddress, newPoints) => {
  try {
    const response = await api.post('/user/update-points', { walletAddress, newPoints });
    return response;
  } catch (error) {
    console.error(`Error updating points for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

export const claimPoints = async (walletAddress, points) => {
  try {
    console.log(`Claiming points for walletAddress: ${walletAddress} with points: ${points}`);
    const response = await api.post('/user/claim-points', { walletAddress, points });
    console.log('Points successfully claimed and added to the user account:', response);
    return response;
  } catch (error) {
    console.error(`Error claiming points for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

export const getSubscriptionConfig = async () => {
  console.log('Fetching subscription config');
  try {
    const response = await api.get('/subscription/config');
    console.log('Subscription config successfully fetched:', response);
    return response;
  } catch (error) {
    console.error('Error fetching subscription config:', error.message);
    throw error;
  }
};

export const checkSubscription = async (walletAddress) => {
  console.log(`Checking subscription status for walletAddress: ${walletAddress}`);
  try {
    const response = await api.get(`/subscription/${walletAddress}`);
    console.log('Subscription status successfully checked:', response);
    return response;
  } catch (error) {
    console.error(`Error checking subscription for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

export const notifySubscriptionTransaction = async (walletAddress, phoneNumber, txHash, amount) => {
  console.log(`Notifying backend about subscription transaction:`, {
    walletAddress,
    phoneNumber,
    txHash,
    amount
  });
  try {
    const response = await api.post('/user/subscription', {
      walletAddress,
      phoneNumber,
      txHash,
      amount
    });
    console.log('Subscription transaction notification successful:', response);
    return response;
  } catch (error) {
    console.error(`Error notifying subscription transaction:`, error.message);
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

export const getChallenge = async () => {
  try {
    const response = await api.get('/challenge/generate');
    console.log('Full response from server:', response);
    if (!response.challenge) {
      throw new Error('Invalid response structure from server.');
    }
    return {
      clientId: response.clientId || Date.now().toString(),
      challenge: response.challenge
    };
  } catch (error) {
    console.error('Error requesting challenge:', error.message);
    throw error;
  }
};

export const verifyProof = async (account, tonProof, clientId) => {
  try {
    const response = await api.post('/challenge/verify', {
      walletAddress: account.address,
      tonProof: tonProof,
      account: account,
      clientId: clientId
    });
    console.log('Proof verification response:', response);
    return response;
  } catch (error) {
    console.error('Error verifying proof:', error.message);
    throw error;
  }
};

export const verifyChallenge = async (walletAddress, tonProof, account) => {
  try {
    const response = await api.post('/challenge/verify', {
      walletAddress,
      tonProof,
      account,
    });
    if (response && response.valid !== undefined) {
      console.log(response.valid);
    } else {
      console.log('Full response from server:', response);
    }
    return response.valid;
  } catch (error) {
    console.error(`Error verifying challenge for address ${walletAddress}:`, error.message);
    throw error;
  }
};