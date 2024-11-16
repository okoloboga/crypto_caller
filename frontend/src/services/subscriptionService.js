import apiService from './apiService';

export const checkSubscription = async () => {
  return apiService.get('/subscription/status');
};

export const createSubscription = async (phoneNumber) => {
  return apiService.post('/subscription', { phoneNumber });
};

export const cancelSubscription = async () => {
  return apiService.delete('/subscription');
};
