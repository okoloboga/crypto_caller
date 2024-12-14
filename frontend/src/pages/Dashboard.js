import React, { useState, useEffect, useCallback } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import { TonConnectButton } from '@tonconnect/ui-react';
import Footer from '../components/Footer';
import PointsWidget from '../components/PointsWidget';
import SubscriptionForm from '../components/SubscriptionForm';
import { getUserTasks, deleteTask, checkSubscription, getUserByWalletAddress } from '../services/apiService';
import { Box, Snackbar, Alert, Typography } from '@mui/material';

const Dashboard = () => {
  const walletAddress = useTonAddress();
  const { language } = useLanguage(); // Используем текущий язык из контекста
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [currencyPairs] = useState(['BTC-USD', 'ETH-USD', 'TON-USD']);
  const [notification, setNotification] = useState('');
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [open, setOpen] = useState(false); 
  const [totalPoints, setTotalPoints] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Коллбек для обновления подписки
  const handleSubscriptionStatusChange = (status) => {
    setIsSubscribed(status);
  };

  useEffect(() => {
    if (walletAddress) {
      checkSubscriptionStatus();
      fetchUserData();  // Получаем данные о пользователе при монтировании компонента
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress && isSubscribed) {
      fetchTasks();
    }
  }, [walletAddress, isSubscribed]);

  // При монтировании компонента загрузить данные из localStorage
  useEffect(() => {
    const storedTotalPoints = localStorage.getItem('totalPoints');
    if (storedTotalPoints) {
      setTotalPoints(parseFloat(storedTotalPoints));  // Устанавливаем значение из localStorage
    }
  }, []);  // Этот useEffect выполняется один раз при монтировании компонента

  useEffect(() => {
    const storedLastUpdated = localStorage.getItem('lastUpdated');
    if (storedLastUpdated) {
      setLastUpdated(new Date(storedLastUpdated));  // Если есть сохраненная дата
    } else {
      setLastUpdated(new Date());  // Устанавливаем текущую дату, если нет
    }
  }, []);

  useEffect(() => {
    const storedLastPoints = localStorage.getItem('lastPoints');
    if (storedLastPoints) {
      setLastPoints(parseFloat(storedLastPoints));
    }
  }, []);

  // Сохраняем данные в localStorage при изменении totalPoints
  useEffect(() => {
    if (totalPoints !== undefined) {
      localStorage.setItem('totalPoints', totalPoints.toString());  // Сохраняем totalPoints в localStorage
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

  // Функция для обновления данных в родительском компоненте
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
        setLastUpdated(new Date());  // Используем актуальную дату
        localStorage.setItem('totalPoints', '0');
        localStorage.setItem('lastUpdated', new Date().toISOString());  // Сохраняем актуальное время
      } else {
        console.log('Полученный пользователь:', response);
        const lastUpdated = response.lastUpdated ? new Date(response.lastUpdated) : new Date();
        
        // Проверяем валидность даты
        setTotalPoints(response.points);
        setLastPoints(response.lastPoints);
        setLastUpdated(isValidDate(lastUpdated) ? lastUpdated : new Date());  // Если дата невалидная, используем текущую дату
        localStorage.setItem('totalPoints', response.points); 
        localStorage.setItem('lastUpdated', lastUpdated.toISOString());  // Сохраняем последнюю актуальную дату
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLastUpdated(new Date());  // В случае ошибки устанавливаем текущую дату
      localStorage.setItem('totalPoints', '0');
      localStorage.setItem('lastUpdated', new Date().toISOString());  // Сохраняем актуальное время
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

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  const showNotification = (message) => {
    setNotification(message);  // Устанавливаем текст уведомления
    setOpen(true);  // Показываем Snackbar

    setTimeout(() => {
      setNotification('');
      setOpen(false);  // Скрываем уведомление после 3 секунд
    }, 3000);  // Уведомление скрывается через 3 секунды
  };

  const handleSave = async () => {
    await fetchTasks();
    setCurrentTask(null);
  };

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

  const handleCreateTask = () => {
    if (!walletAddress) {
      showNotification('Connect your wallet to create a task.');
    } else if (!isSubscribed) {
      showNotification('Buy a subscription to create a task.');
    } else {
      setCurrentTask({ currencyPair: '', targetPrice: '' });
    }
  };

  if (currentScreen === 'subscription') {
    return (
      <SubscriptionForm 
        onBack={handleBackToDashboard} 
        onSubscriptionChange={handleSubscriptionStatusChange}  // Передаем функцию для обновления подписки
      />
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',  // Убедитесь, что весь экран заполняется
        backgroundColor: 'primary.main',  // Устанавливаем основной цвет фона для всего приложения
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,  // Заставляем основной контент занимать всё доступное пространство
          backgroundColor: 'primary.main',  // Если хотите только контент в этом фоне
        }}
      >
        <header>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center', // Выравнивание по горизонтали (по центру)
              alignItems: 'center', // Выравнивание по вертикали (по центру)
              height: '100%', // Устанавливаем высоту, чтобы кнопка располагалась по центру всего доступного пространства
              margin: 1,
            }}
          >
            <TonConnectButton />
          </Box>
        </header>

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
          autoHideDuration={3000} // Уведомление будет скрываться через 3 секунды
          onClose={() => setOpen(false)}  // Закрываем уведомление вручную
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Позиция уведомления
          sx={{
            borderRadius: 2,
            marginBottom: '140px', // Добавляем отступ снизу, чтобы переместить его выше
          }}
        >
          <Alert onClose={() => setOpen(false)} severity="error" sx={{ width: '100%' }}>
            {notification}
          </Alert>
        </Snackbar>
      </Box>
      
      <Box
        sx={{
            display: 'flex',
            justifyContent: 'center', // Выравнивание по горизонтали (по центру)
            alignItems: 'center', // Выравнивание по вертикали (по центру)
            height: '100%', // Устанавливаем высоту, чтобы кнопка располагалась по центру всего доступного пространства
            margin: 1,
          }}
      >
        <Typography variant='h5'>
          ₽UBLE: {totalPoints}
        </Typography>
      </Box>

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

      {/* Footer всегда внизу */}
      <Footer 
        showNotification={showNotification}
        handleCreateTask={handleCreateTask}
        onNavigate={setCurrentScreen} 
      />
    </Box>
  );
};

export default Dashboard;
