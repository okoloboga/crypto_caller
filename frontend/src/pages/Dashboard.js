import React, { useState, useEffect } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import Header from '../components/Header';
import PointsWidget from '../components/PointsWidget';
import SubscriptionForm from '../components/SubscriptionForm'; // Импорт формы подписки
import { getUserTasks, deleteTask, checkSubscription } from '../services/apiService';
import './Dashboard.css';

const Dashboard = () => {
  const walletAddress = useTonAddress();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [currencyPairs] = useState(['BTC/USDT', 'ETH/USDT', 'TON/USDT']);
  const [notification, setNotification] = useState('');
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // Управляет текущим экраном

  useEffect(() => {
    if (walletAddress) {
      checkSubscriptionStatus();
      fetchTasks();
    }
  }, [walletAddress]);

  const checkSubscriptionStatus = async () => {
    try {
      const subscriptionStatus = walletAddress ? await checkSubscription(walletAddress) : false;
      setIsSubscribed(subscriptionStatus);
    } catch (error) {
      console.error('Ошибка проверки подписки:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await getUserTasks(walletAddress);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Ошибка загрузки заданий:', error);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000); // Очистить уведомление через 3 секунды
  };

  if (currentScreen === 'subscription') {
    return (
      <SubscriptionForm onBack={handleBackToDashboard} />
    );
  }

  return (
    <div className="dashboard">
      <Header onNavigate={setCurrentScreen} />
      <PointsWidget isSubscribed={isSubscribed} showNotification={showNotification} />

      <button
        onClick={() => {
          if (!walletAddress) {
            showNotification('Подключи кошелек, чтобы создать задание.');
          } else if (!isSubscribed) {
            showNotification('Купи подписку, чтобы создать задание.');
          } else {
            setCurrentTask({ currencyPair: '', targetPrice: '' });
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
          onSave={fetchTasks}
          onCancel={() => setCurrentTask(null)}
        />
      ) : (
        <TaskList tasks={tasks} onEdit={setCurrentTask} onDelete={deleteTask} />
      )}

      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default Dashboard;
