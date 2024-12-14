import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { claimPoints, updatePoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { Box, LinearProgress, Paper } from '@mui/material';
import { use } from 'i18next';
import logoSmall from '../../public/logoSmall.png';

const PointsWidget = ({ isSubscribed, showNotification, totalPoints, lastPoints, lastUpdated, updatePointsData }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [localLastPoints, setLastPoints] = useState(lastPoints);
  const [localTotalPoints, setTotalPoints] = useState(totalPoints);
  const [isActive, setIsActive] = useState(true);
  const maxPoints = 50.000;

  useEffect(() => {
    const handleUserActivity = () => {
      setIsActive(true);  // Пользователь активен
    };
  
    const inactivityTimer = setTimeout(() => {
      setIsActive(false);  // Пользователь неактивен
    }, 30000);  // Например, через 30 секунд неактивности
  
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
  
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
    };
  }, []);

  useEffect(() => {
    if (!isSubscribed || !walletAddress) return;  // Если нет подписки или адреса, не запускаем логику
  
    // Запускать каждую секунду, если подписка активна
    const interval = setInterval(() => {
      incrementPoints(); // Плавно увеличиваем очки
    }, 1000); // Обновление каждую секунду
  
    // Запускать при изменении lastUpdated
    incrementPoints(); // Немедленно запускаем, если lastUpdated изменилось
  
    return () => clearInterval(interval);  // Очистить интервал при размонтировании компонента
  }, [isSubscribed, walletAddress, lastUpdated]);
   // Следим только за этими изменениями

  useEffect(() => {
    if (lastUpdated && !isNaN(new Date(lastUpdated).getTime())) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / 1000;
      const accumulationRate = 0.001;
      const newPoints = Math.min(localLastPoints + timeElapsed * accumulationRate, maxPoints);
      setLastPoints(newPoints);  // Обновляем локальные очки
    
      // Сохраняем прогресс на сервере при длительном бездействии
      if (!isActive && Math.abs(newPoints - localLastPoints) >= 1) {
        saveProgressToServer(newPoints); // Сохраняем на сервере
      }
    }
  }, [lastUpdated]);  // Следим за изменениями времени последнего обновления  

  useEffect(() => {
    setTotalPoints(totalPoints);  // Синхронизируем локальное состояние с новым значением prop
  }, [totalPoints]); 

  useEffect(() => {
    setLastPoints(lastPoints);  // Синхронизируем локальное состояние с новым значением prop
  }, [lastPoints]);
  
  // Функция для сохранения прогресса (очков) на сервере
  const saveProgressToServer = async (newPoints) => {
    try {
      await updatePoints(walletAddress, newPoints);  // Отправляем накопленные очки на сервер в lastPoints
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  // Функция для сбора очков и отправки на сервер
  const handleProgressBarClick = async () => {
    if (!isSubscribed) {
      showNotification(t('noSubscription'));
      return; // Прерываем выполнение, если нет подписки
    }
  
    if (localLastPoints > 0) {
      try {
        console.log(`Claiming points: ${localLastPoints}`);
        await claimPoints(walletAddress, localLastPoints);
        const newTotalPoints = localTotalPoints + localLastPoints;

        setTotalPoints(newTotalPoints);
        setLastPoints(0);

        updatePointsData(newTotalPoints, 0, new Date()); // Обновляем данные в родителе
        showNotification(t('pointsClaimed'));
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError'));
      }
    }
  };

  // Функция для плавного увеличения очков на фронтенде
  const incrementPoints = () => {
    console.log('incrementPoints called, lastUpdated:', lastUpdated);
    if (lastUpdated && !isNaN(new Date(lastUpdated).getTime())) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / 1000;
      const accumulationRate = 0.001;
      const newPoints = Math.min(localLastPoints + timeElapsed * accumulationRate, maxPoints);
  
      console.log(`Last Update: ${new Date(lastUpdated)}, localLastPoints: ${localLastPoints}, New points: ${newPoints}`);
  
      // Обновляем локальное состояние
      setLastPoints(newPoints);
  
      // Если пользователь неактивен, сохраняем промежуточные очки
      if (!isActive && Math.abs(newPoints - localLastPoints) >= 1) {
        saveProgressToServer(newPoints);  // Сохраняем очки в lastPoints на сервере
      }
    } else {
      console.log('Last updated time is null or invalid');
    }
  };

  return (
    <Paper sx={{ 
      height: '60px',
      padding: 2, 
      borderRadius: 8, 
      boxShadow: 3,
      margin: 1, 
      }}
    >
      {/* Прогресс-бар для накопления очков */}
      <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={handleProgressBarClick}>   
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '40px',  // Размер изображения
            height: '40px',  // Размер изображения
            backgroundImage: logoSmall,  // Путь к изображению
            backgroundSize: 'contain',  // Чтобы изображение масштабировалось
            backgroundRepeat: 'no-repeat',  // Запрещаем повтор изображения
          }}
        />
        <LinearProgress
          variant="determinate"
          value={(localLastPoints / maxPoints) * 100}  // Значение прогресса в процентах
          color="secondary"  // Цвет для заполненной части
          sx={{
            height: '30px',
            borderRadius: 8,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'secondary.main',  // Цвет заполненной части
              borderTopRightRadius: '8px',  // Закругляем правый верхний угол
              borderBottomRightRadius: '8px',  // Закругляем правый нижний угол
            },
            '& .MuiLinearProgress-root': {
              backgroundColor: '#000000',  // Цвет незаполненной части
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          {localLastPoints.toFixed(3)} / {maxPoints}
        </Box>
      </Box>
    </Paper>
  );
};

export default PointsWidget;
