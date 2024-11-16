import apiService from './apiService';

export const getUserTasks = async () => {
  return apiService.get('/task');
};

export const createTask = async (task) => {
  return apiService.post('/task', task);
};

export const updateTask = async (taskId, updates) => {
  return apiService.patch(`/task/${taskId}`, updates);
};
