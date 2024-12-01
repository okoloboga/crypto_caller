import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { claimPoints, updatePoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification, totalPoints, lastPoints, lastUpdated }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [localLastPoints, setLastPoints] = useState(lastPoints);
  const [localTotalPoints, setTotalPoints] = useState(totalPoints);
  const [isActive, setIsActive] = useState(true);  // Статус активности пользователя
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
    if (isSubscribed && walletAddress) {
      const interval = setInterval(() => {
        incrementPoints();  // Плавно увеличиваем очки, если прошло достаточно времени
      }, 1000); // Обновляем каждую секунду
  
      return () => clearInterval(interval);  // Очищаем интервал при размонтировании компонента
    }
  }, [isSubscribed, walletAddress]);  // Следим только за этими изменениями
  
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
        await claimPoints(walletAddress, localLastPoints);
        showNotification(t('pointsClaimed'));
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError'));
      }
    }
  };

  // Функция для плавного увеличения очков на фронтенде
  const incrementPoints = () => {
    console.log('incrementPoints called');
    if (lastUpdated) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / 1000;
      const accumulationRate = 0.035;

      // Рассчитываем новые очки с учетом времени
      const newPoints = Math.min(localLastPoints + timeElapsed * accumulationRate, maxPoints);

      // Обновляем локальное состояние
      setLastPoints(newPoints);

      // Если пользователь неактивен, сохраняем промежуточные очки
      if (!isActive && Math.abs(newPoints - localLastPoints) >= 1) {
        saveProgressToServer(newPoints);  // Сохраняем очки в lastPoints на сервере
      }
    } else {
      console.log('Last updated time is null');
    }
  };

  // useEffect для обновления данных и плавного увеличения очков
  useEffect(() => {
    if (isSubscribed && walletAddress) {
      const interval = setInterval(() => {
        incrementPoints();  // Плавно увеличиваем очки, если прошло достаточно времени
      }, 1000); // Обновляем каждую секунду

      return () => clearInterval(interval);  // Очищаем интервал при размонтировании компонента
    }
  }, [isSubscribed, walletAddress, localLastPoints, lastUpdated]);  // Следим за изменениями

  return (
    <div className="points-widget">
      {/* Прогресс-бар для накопления очков */}
      <div className="progress-container" onClick={handleProgressBarClick}>
        <progress value={localLastPoints.toFixed(3)} max={maxPoints}></progress>
        <div className="progress-overlay">
          {localLastPoints.toFixed(3)} / {maxPoints}
        </div>
      </div>
      <h3>{t('points')}: {localTotalPoints.toFixed(3)}</h3>
    </div>
  );
};

export default PointsWidget;
