import React, { useState, useEffect } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import Header from '../components/Header';
import PointsWidget from '../components/PointsWidget';
import SubscriptionForm from '../components/SubscriptionForm'; // Import subscription form
import { getUserTasks, deleteTask, checkSubscription } from '../services/apiService';
import './Dashboard.css';

const Dashboard = () => {
  const walletAddress = useTonAddress();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [currencyPairs] = useState(['BTC/USDT', 'ETH/USDT', 'TON/USDT']);
  const [notification, setNotification] = useState('');
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  useEffect(() => {
    if (walletAddress) {
      checkSubscriptionStatus();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress && isSubscribed) {
      fetchTasks();
    }
  }, [walletAddress, isSubscribed]);

  const checkSubscriptionStatus = async () => {
    try {
      const subscriptionStatus = walletAddress ? Boolean(await checkSubscription(walletAddress)) : false;
      setIsSubscribed(subscriptionStatus);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsSubscribed(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await getUserTasks(walletAddress);
      console.log(`Tasks: ${fetchedTasks}`);
      if (fetchedTasks === undefined) {
        console.log('No tasks available');
      } else {
        setTasks(fetchedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleSave = async () => {
    // После сохранения обновим задачи и закроем форму
    await fetchTasks();
    setCurrentTask(null); // Закрыть форму после сохранения
  };

  if (currentScreen === 'subscription') {
    return <SubscriptionForm onBack={handleBackToDashboard} />;
  }

  return (
    <div className="dashboard">
      <Header onNavigate={setCurrentScreen} />
      <PointsWidget isSubscribed={isSubscribed} showNotification={showNotification} />

      <button
        onClick={() => {
          if (!walletAddress) {
            showNotification('Connect your wallet to create a task.');
          } else if (!isSubscribed) {
            showNotification('Buy a subscription to create a task.');
          } else {
            setCurrentTask({ currencyPair: '', targetPrice: '' });
          }
        }}
        className="create-task-button"
      >
        Create Task
      </button>

      {currentTask ? (
        <TaskForm
          task={currentTask}
          currencyPairs={currencyPairs}
          onSave={handleSave}  // Обновленный обработчик для закрытия формы
          onCancel={() => setCurrentTask(null)}  // Закрытие формы при отмене
        />
      ) : (
        <TaskList tasks={tasks} onEdit={setCurrentTask} onDelete={deleteTask} />
      )}

      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default Dashboard;
