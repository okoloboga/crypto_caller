import React, { useState, useEffect, useCallback } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import Footer from '../components/Footer';
import PointsWidget from '../components/PointsWidget';
import SubscriptionForm from '../components/SubscriptionForm';
import { getUserTasks, deleteTask, checkSubscription, getUserByWalletAddress } from '../services/apiService';
import { Box, Snackbar, Alert } from '@mui/material';

const Dashboard = () => {
  const walletAddress = useTonAddress();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [onSubscription, setOnSubscription] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [currencyPairs] = useState(['BTC-USD', 'ETH-USD', 'TON-USD']);
  const [hasTonProof, setHasTonProof] = useState(false);
  const [notification, setNotification] = useState('');
  const [open, setOpen] = useState(false); 
  const [totalPoints, setTotalPoints] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleSubscriptionStatusChange = (status) => {
    setIsSubscribed(status);
  };

  useEffect(() => {
    document.title = "RUBLE CALLER";
  }, []);

  useEffect(() => {
    if (walletAddress) {
      checkSubscriptionStatus();
      fetchUserData();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress && isSubscribed) {
      fetchTasks();
    }
  }, [walletAddress, isSubscribed]);

  useEffect(() => {
    const storedTotalPoints = localStorage.getItem('totalPoints');
    if (storedTotalPoints) {
      setTotalPoints(parseFloat(storedTotalPoints));
    }
  }, []);

  useEffect(() => {
    const storedLastUpdated = localStorage.getItem('lastUpdated');
    if (storedLastUpdated) {
      setLastUpdated(new Date(storedLastUpdated));
    } else {
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    const storedLastPoints = localStorage.getItem('lastPoints');
    if (storedLastPoints) {
      setLastPoints(parseFloat(storedLastPoints));
    }
  }, []);

  useEffect(() => {
    if (totalPoints !== undefined) {
      localStorage.setItem('totalPoints', totalPoints.toString());
    }
  }, [totalPoints]);

  useEffect(() => {
    if (lastPoints !== undefined) {
      localStorage.setItem('lastPoints', lastPoints.toString());
    }
  }, [lastPoints]);

  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date);
  };

  const updatePointsData = useCallback((newTotalPoints, newLastPoints, newLastUpdated) => {
    console.log('Updating points data:', newTotalPoints, newLastPoints, newLastUpdated);
    setTotalPoints(newTotalPoints);
    setLastPoints(newLastPoints);
    setLastUpdated(newLastUpdated);
  }, []);
  
  const fetchUserData = async () => {
    try {
      const response = await getUserByWalletAddress(walletAddress);
      if (response === false) {
        console.log('Пользователь не найден');
        setTotalPoints(0);
        setLastPoints(0);
        setLastUpdated(new Date());
        localStorage.setItem('totalPoints', '0');
        localStorage.setItem('lastUpdated', new Date().toISOString());
      } else {
        console.log('Полученный пользователь:', response);
        const lastUpdated = response.lastUpdated ? new Date(response.lastUpdated) : new Date();
        
        // Проверяем валидность даты
        setTotalPoints(response.points);
        setLastPoints(response.lastPoints);
        setLastUpdated(isValidDate(lastUpdated) ? lastUpdated : new Date());
        localStorage.setItem('totalPoints', response.points); 
        localStorage.setItem('lastUpdated', lastUpdated.toISOString());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLastUpdated(new Date());
      localStorage.setItem('totalPoints', '0');
      localStorage.setItem('lastUpdated', new Date().toISOString());
    }
  };
  

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

  const showNotification = (message) => {
    setNotification(message);
    setOpen(true);

    setTimeout(() => {
      setNotification('');
      setOpen(false);
    }, 3000);
  };

  const handleSave = async () => {
    await fetchTasks();
    setCurrentTask(null);
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      showNotification(t('taskDeleted'));
    } catch (error) {
      console.error('Error deleting task:', error);
      showNotification(t('taskDeleteFail'));
    }
  };

  const handleSubscribe = () => {
    if (!walletAddress) {
      showNotification(t('connectWallet'));
      setTimeout(() => showNotification(''), 2000);
    } else if (!hasTonProof) {
      showNotification(t('tryConnection'));
      setTimeout(() => showNotification(''), 2000);
    } else {
      setOnSubscription(true);
    }
  };

  const handleCreateTask = () => {
    if (!walletAddress) {
      showNotification(t('tryConnection'));
    } else if (!isSubscribed) {
      showNotification(t('noSubscription'));
    } else {
      setCurrentTask({ currencyPair: 'BTC-USD', targetPrice: '0' });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header 
        showNotification={showNotification}
        handleSubscribe={handleSubscribe}
        setHasTonProof={setHasTonProof} 
      />

      <Box
        component="main"
        sx={{
          flex: 1,
        }}
      >

        <Box sx={{ position: 'relative' }}>
          <PointsWidget 
            isSubscribed={isSubscribed}
            showNotification={showNotification}
            totalPoints={totalPoints}
            lastPoints={lastPoints}
            lastUpdated={lastUpdated}
            updatePointsData={updatePointsData}
          />
        </Box>

        {onSubscription ? (
          <SubscriptionForm 
            onCancel={() => setOnSubscription(false)} 
            onSubscriptionChange={handleSubscriptionStatusChange} 
            />
        ) : (
          <>
          </>
        )}

        {/* Формы и список задач */}
        {currentTask ? (
          <TaskForm
            task={currentTask}
            currencyPairs={currencyPairs}
            onSave={handleSave}
            onCancel={() => setCurrentTask(null)}
          />
        ) : (
          <TaskList 
            tasks={tasks} 
            onEdit={setCurrentTask} 
            onDelete={handleDelete} 
          />
        )}

        {/* Сообщение с уведомлением */}
        <Snackbar
          open={open}
          autoHideDuration={3000}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            borderRadius: 2,
            marginBottom: '140px',
          }}
        >
          <Alert onClose={() => setOpen(false)} severity="error" sx={{ width: '100%' }}>
            {notification}
          </Alert>
        </Snackbar>
      </Box>

      {/* Footer всегда внизу */}
      <Footer 
        showNotification={showNotification}
        handleCreateTask={handleCreateTask}
        handleSubscribe={handleSubscribe}
        setHasTonProof={setHasTonProof}
      />
    </Box>
  );
};

export default Dashboard;
