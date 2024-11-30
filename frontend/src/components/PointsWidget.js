import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { claimPoints, updatePoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification, totalPoints, lastPoints, lastUpdated }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [lastPoints, setLastPoints] = useState(lastPoints || 0);
  const [totalPoints, setTotalPoints] = useState(totalPoints || 0);
  const [isActive, setIsActive] = useState(true);  // Статус активности пользователя
  const [targetPoints, setTargetPoints] = useState(50);  // Максимальное количество очков

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
    console.log('handleProgressBarClick called');
    if (lastPoints > 0) {
      try {
        console.log('Claiming points:', lastPoints);
        // Отправляем очки на сервер
        await claimPoints(walletAddress, lastPoints);
        showNotification(t('pointsClaimed'));  // Показываем сообщение об успешном сборе очков
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError'));  // Сообщение об ошибке
      }
    }
  };

  // Функция для плавного увеличения очков на фронтенде
  const incrementPoints = () => {
    console.log('incrementPoints called');
    if (lastUpdated) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / (1000 * 60 * 60); // Время, прошедшее с последнего обновления (в часах)
      const accumulationRate = 2;  // Количество очков, которое начисляется каждый час

      setPoints(prevPoints => {
        let newPoints = prevPoints + timeElapsed * accumulationRate;

        // Ограничиваем максимальное количество очков
        if (newPoints > targetPoints) {
          newPoints = targetPoints;
        }

        console.log('New points calculated:', newPoints);
        return newPoints;
      });

      // Если пользователь неактивен, сохраняем промежуточные очки
      if (!isActive) {
        saveProgressToServer(lastPoints);  // Сохраняем очки в lastPoints на сервере
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
  }, [isSubscribed, walletAddress, lastPoints, lastUpdated]);  // Следим за изменениями

  return (
    <div className="points-widget">
      {/* Прогресс-бар для накопления очков */}
      <div className="progress-container" onClick={handleProgressBarClick}>
        <progress value={lastPoints} max={targetPoints}></progress>
        <div className="progress-overlay">
          {lastPoints.toFixed(1)} / {targetPoints}
        </div>
      </div>
      <h3>{t('points')}: {totalPoints.toFixed(1)}</h3>
    </div>
  );
};

export default PointsWidget;
