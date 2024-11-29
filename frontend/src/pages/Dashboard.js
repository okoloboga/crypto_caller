import React, { useState, useEffect } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import Header from '../components/Header';
import PointsWidget from '../components/PointsWidget';
import SubscriptionForm from '../components/SubscriptionForm';
import { getUserTasks, deleteTask, checkSubscription } from '../services/apiService';
import './Dashboard.css';

const Dashboard = () => {
  const walletAddress = useTonAddress();
  const { language } = useLanguage(); // Используем текущий язык из контекста
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [currencyPairs] = useState(['BTC-USD', 'ETH-USD', 'TON-USD']);
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
    await fetchTasks();
    setCurrentTask(null);
  };

  if (currentScreen === 'subscription') {
    return <SubscriptionForm onBack={handleBackToDashboard} />;
  }

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      showNotification('Task successfully deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      showNotification('Failed to delete task. Please try again.');
    }
  };

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
        {language === 'en' ? 'Create Task' : 'Создать задачу'}
      </button>

      {currentTask ? (
        <TaskForm
          task={currentTask}
          currencyPairs={currencyPairs}
          onSave={handleSave}
          onCancel={() => setCurrentTask(null)}
        />
      ) : (
        <TaskList tasks={tasks} onEdit={setCurrentTask} onDelete={handleDelete} />
      )}

      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default Dashboard;
