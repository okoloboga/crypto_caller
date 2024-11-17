import React, { useState, useEffect } from 'react';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import PointsWidget from '../components/PointsWidget'; // Виджет накопления очков
import { getUserTasks, deleteTask, checkSubscription } from '../services/apiService'; // Импорт функции
import './Dashboard.css';

const Dashboard = ({ wallet, onLogin }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [currencyPairs] = useState(['BTC/USDT', 'ETH/USDT', 'TON/USDT']);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (wallet) {
      // Проверяем подписку, если кошелек подключен
      checkSubscriptionStatus();
    }
  }, [wallet]);

  const checkSubscriptionStatus = async () => {
    try {
      const subscriptionStatus = wallet ? await checkSubscription() : false; // Используем правильный вызов
      setIsSubscribed(subscriptionStatus);
    } catch (error) {
      console.error('Ошибка проверки подписки:', error);
    }
  };

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

  const handleCreateTask = () => {
    if (!isSubscribed) {
      showNotification('Купите подписку, чтобы создать задание.');
    } else {
      setCurrentTask({ currencyPair: '', targetPrice: '' }); // Открываем форму создания нового задания
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="dashboard">
      <PointsWidget 
        isSubscribed={isSubscribed} 
        showNotification={showNotification} 
      />

      <button
        onClick={() => {
          if (!wallet) {
            showNotification('Подключите кошелек, чтобы создать задание.');
          } else if (!isSubscribed) {
            showNotification('Купите подписку, чтобы создать задание.');
          } else {
            handleCreateTask();
          }
        }}
        className="create-task-button"
      >
        Создать задание
      </button>

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
