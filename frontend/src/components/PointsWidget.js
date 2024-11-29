import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { getUserByWalletAddress, claimPoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [points, setPoints] = useState(0);  // Текущее количество очков
  const [targetPoints, setTargetPoints] = useState(50);  // Максимальное количество очков, которое можно накопить
  const [lastUpdated, setLastUpdated] = useState(null); // Время последнего обновления

  // Функция для загрузки текущих очков пользователя с сервера
  const loadPoints = async () => {
    if (!isSubscribed) {
      showNotification(t('subscribeToEarn'));
      return;
    }
    try {
      const user = await getUserByWalletAddress(walletAddress);
      setPoints(user.points);  // Получаем текущие очки
      setLastUpdated(new Date());  // Устанавливаем время последнего обновления
    } catch (err) {
      console.error('Error loading points:', err);
    }
  };

  // Функция для плавного увеличения очков на фронтенде
  const incrementPoints = () => {
    if (lastUpdated) {
      const now = Date.now();
      const timeElapsed = (now - lastUpdated.getTime()) / (1000 * 60 * 60); // Время, прошедшее с последнего обновления (в часах)
      const accumulationRate = 2;  // Количество очков, которое начисляется каждый час

      let newPoints = points + timeElapsed * accumulationRate;

      // Ограничиваем максимальное количество очков
      if (newPoints > targetPoints) {
        newPoints = targetPoints;
      }

      setPoints(newPoints);
    }
  };

  // Функция для сбора очков и отправки на сервер
  const handleProgressBarClick = async () => {
    if (points > 0) {
      try {
        // Отправляем очки на сервер
        await claimPoints(walletAddress, points);  
        setPoints(0);  // Сбрасываем прогресс на фронтенде
        setLastUpdated(new Date());  // Обновляем время последнего сбора очков
        showNotification(t('pointsClaimed'));  // Показываем сообщение об успешном сборе очков
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError'));  // Сообщение об ошибке
      }
    }
  };

  // useEffect для плавного увеличения очков в реальном времени
  useEffect(() => {
    if (isSubscribed) {
      loadPoints();  // Загружаем очки с сервера

      const interval = setInterval(() => {
        incrementPoints();  // Плавно увеличиваем очки, если прошло достаточно времени
      }, 1000);  // Обновляем каждую секунду

      return () => clearInterval(interval);  // Очищаем интервал при размонтировании компонента
    }
  }, [isSubscribed, points, targetPoints, lastUpdated]);  // Перезапускаем при изменении этих зависимостей

  return (
    <div className="points-widget">
      {/* Прогресс-бар для накопления очков */}
      <div className="progress-container" onClick={handleProgressBarClick}>
        <progress value={points} max={targetPoints}></progress>
        <div className="progress-overlay">
          {points.toFixed(1)} / {targetPoints}
        </div>
      </div>

      <h3>{t('points')}: {points.toFixed(1)}</h3>
    </div>
  );
};

export default PointsWidget;
