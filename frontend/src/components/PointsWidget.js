import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { claimPoints, updatePoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification, points, lastUpdated }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
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
    if (points > 0) {
      try {
        console.log('Claiming points:', points);
        // Отправляем очки на сервер
        await claimPoints(walletAddress, points);
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
        saveProgressToServer(points);  // Сохраняем очки в lastPoints на сервере
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
  }, [isSubscribed, walletAddress, points, lastUpdated]);  // Следим за изменениями

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
      <p>{t('lastUpdated')}: {lastUpdated ? new Date(lastUpdated).toLocaleString() : t('never')}</p>
    </div>
  );
};

export default PointsWidget;
