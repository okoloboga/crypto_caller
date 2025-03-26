/**
 * API service module for the RUBLE Farming App.
 * This module provides functions to interact with the backend API, handling user data, token withdrawals,
 * subscriptions, tasks, and challenge verification. It uses Axios for HTTP requests with a configured instance.
 */

// Import Axios for making HTTP requests
import axios from 'axios';

/**
 * Create an Axios instance with a base URL and default headers.
 * The base URL is set from the environment variable API_URL or defaults to the production API endpoint.
 */
const api = axios.create({
  baseURL: process.env.API_URL || 'https://caller.ruble.website/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Add an interceptor to handle API response errors.
 * Successful responses return the response data directly, while errors are logged and rejected.
 */
api.interceptors.response.use(
  (response) => response.data, // Return the response data directly
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Fetch user data by wallet address.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @returns {Promise<Object>} The user data from the server.
 * @throws {Error} If the request fails.
 */
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

/**
 * Request a token withdrawal to the user's wallet.
 * @param {string} walletAddress - The TON wallet address to send tokens to.
 * @param {number} amount - The amount of tokens to withdraw.
 * @returns {Promise<Object>} The server response confirming the withdrawal.
 * @throws {Error} If the request fails.
 */
export const requestTokenWithdrawal = async (walletAddress, amount) => {
  console.log(`Requesting token withdrawal for walletAddress: ${walletAddress}, amount: ${amount}`);
  try {
    const response = await api.post('/withdrawal/send-tokens', {
      recipientAddress: walletAddress,
      amount: amount.toString(), // Ensure amount is a string
    });
    console.log('Token withdrawal successful:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error requesting token withdrawal for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

/**
 * Update the user's points.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @param {number} newPoints - The new points value to set.
 * @returns {Promise<Object>} The server response with updated points.
 * @throws {Error} If the request fails.
 */
export const updatePoints = async (walletAddress, newPoints) => {
  try {
    const response = await api.post('/user/update-points', { walletAddress, newPoints });
    return response;
  } catch (error) {
    console.error(`Error updating points for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

/**
 * Claim points for the user, adding them to their account.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @param {number} points - The points to claim.
 * @returns {Promise<Object>} The server response confirming the points were claimed.
 * @throws {Error} If the request fails.
 */
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

/**
 * Check the subscription status of a user.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @returns {Promise<Object>} The server response with the subscription status.
 * @throws {Error} If the request fails.
 */
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

/**
 * Create a subscription for a user.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @param {string} phoneNumber - The user's phone number for receiving calls.
 * @param {string} signedChallenge - The signed challenge for verification.
 * @returns {Promise<Object>} The server response confirming the subscription creation.
 * @throws {Error} If the request fails.
 */
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

/**
 * Update the user's phone number.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @param {string} phoneNumber - The new phone number to set.
 * @returns {Promise<Object>} The server response confirming the update.
 * @throws {Error} If the request fails.
 */
export const updatePhoneNumber = async (walletAddress, phoneNumber) => {
  try {
    const response = await api.patch(`/user/${walletAddress}/phone`, { phoneNumber });
    return response;
  } catch (error) {
    console.error('Error updating phone number:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetch the list of tasks for a user.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @returns {Promise<Object>} The server response with the user's task list.
 * @throws {Error} If the request fails.
 */
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

/**
 * Create a new task for monitoring a currency pair.
 * @param {Object} taskData - The task data, including currency pair and price trigger.
 * @returns {Promise<Object>} The server response confirming the task creation.
 * @throws {Error} If the request fails.
 */
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

/**
 * Update an existing task.
 * @param {string} taskId - The ID of the task to update.
 * @param {Object} updates - The updated task data.
 * @returns {Promise<Object>} The server response confirming the task update.
 * @throws {Error} If the request fails.
 */
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

/**
 * Delete a task.
 * @param {string} taskId - The ID of the task to delete.
 * @returns {Promise<Object>} The server response confirming the task deletion.
 * @throws {Error} If the request fails.
 */
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

/**
 * Generate a challenge for wallet verification.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @returns {Promise<string>} The generated challenge string.
 * @throws {Error} If the request fails or the response structure is invalid.
 */
export const getChallenge = async (walletAddress) => {
  try {
    const response = await api.get('/challenge/generate', {
      params: { walletAddress },
    });
    console.log('Full response from server:', response);
    if (!response.challenge) {
      throw new Error('Invalid response structure from server.');
    }
    return response.challenge;
  } catch (error) {
    console.error(`Error requesting challenge for walletAddress ${walletAddress}:`, error.message);
    throw error;
  }
};

/**
 * Verify a challenge for wallet authentication.
 * @param {string} walletAddress - The TON wallet address of the user.
 * @param {string} tonProof - The proof provided by the TON wallet.
 * @param {Object} account - The account details for verification.
 * @returns {Promise<boolean>} True if the challenge is valid, false otherwise.
 * @throws {Error} If the request fails.
 */
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