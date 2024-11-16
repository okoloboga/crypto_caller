import React, { useState, useEffect } from 'react';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import { getUserTasks, deleteTask } from '../services/apiService';
import './Dashboard.css';

const Dashboard = ({ wallet, onLogin }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [currencyPairs] = useState(['BTC/USDT', 'ETH/USDT', 'TON/USDT']);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (isSubscribed) {
      fetchTasks();
    }
  }, [isSubscribed]);

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await getUserTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Ошибка загрузки заданий:', error);
    }
  };

  const handleSaveTask = () => {
    fetchTasks();
    setCurrentTask(null);
  };

  const handleEditTask = (task) => {
    setCurrentTask(task);
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Ошибка удаления задания:', error);
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="dashboard">
      {currentTask ? (
        <TaskForm
          task={currentTask}
          currencyPairs={currencyPairs}
          onSave={handleSaveTask}
          onCancel={() => setCurrentTask(null)}
          disabled={!isSubscribed}
          onDisabledAction={() => showNotification('Купите подписку, чтобы использовать эту функцию.')}
        />
      ) : (
        <TaskList
          tasks={tasks}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          isDisabled={!isSubscribed}
          onDisabledAction={() => showNotification('Купите подписку, чтобы использовать эту функцию.')}
        />
      )}
      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default Dashboard;
