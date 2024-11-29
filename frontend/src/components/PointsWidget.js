import React, { useEffect, useState, useRef } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { getUserByWalletAddress, claimPoints, updatePoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [points, setPoints] = useState(0);  // Текущее количество очков
  const [lastUpdated, setLastUpdated] = useState(null); // Время последнего обновления
  const [targetPoints, setTargetPoints] = useState(50);  // Максимальное количество очков
  const lastLoaded = useRef(false);  // Флаг для проверки, были ли данные уже загружены

  // Функция для загрузки текущих очков пользователя с сервера
  const loadPoints = async () => {
    console.log('loadPoints called');
    if (!isSubscribed) {
      showNotification(t('subscribeToEarn'));
      return;
    }
    if (lastLoaded.current) return; // Предотвращаем повторный запрос, если данные уже загружены
    try {
      const user = await getUserByWalletAddress(walletAddress);
      console.log('Points loaded from server:', user.points, 'Last updated:', user.lastUpdated);
      setPoints(user.points);  // Получаем текущие очки
      setLastUpdated(new Date(user.lastUpdated));  // Устанавливаем время последнего обновления
      lastLoaded.current = true; // Устанавливаем флаг загрузки данных

      // Обновляем очки на сервере
      await updatePoints(walletAddress); // Это и есть ваш вызов updatePoints для синхронизации
    } catch (err) {
      console.error('Error loading points:', err);
    }
  };

  // Функция для плавного увеличения очков на фронтенде
  const incrementPoints = () => {
    console.log('incrementPoints called');
    if (lastUpdated) {
      const now = Date.now();
      const timeElapsed = (now - lastUpdated.getTime()) / (1000 * 60 * 60); // Время, прошедшее с последнего обновления (в часах)
      const accumulationRate = 2;  // Количество очков, которое начисляется каждый час

      let newPoints = points + timeElapsed * accumulationRate;

      // Ограничиваем максимальное количество очков
      if (newPoints > targetPoints) {
        newPoints = targetPoints;
      }

      console.log('New points calculated:', newPoints);
      setPoints(newPoints);

      // Синхронизируем новые очки с сервером
      updatePoints(walletAddress);  // Снова вызываем updatePoints, чтобы обновить очки на сервере
    } else {
      console.log('Last updated time is null');
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
        setPoints(0);  // Сбрасываем прогресс на фронтенде
        setLastUpdated(new Date());  // Обновляем время последнего сбора очков
        showNotification(t('pointsClaimed'));  // Показываем сообщение об успешном сборе очков
        lastLoaded.current = false; // Сброс флага после успешного сбора
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError'));  // Сообщение об ошибке
      }
    }
  };

  // useEffect для загрузки очков при изменении подписки или адреса
  useEffect(() => {
    console.log('useEffect called');
    if (isSubscribed && walletAddress) {
      loadPoints();  // Загружаем очки с сервера только один раз при изменении подписки

      const interval = setInterval(() => {
        incrementPoints();  // Плавно увеличиваем очки, если прошло достаточно времени
      }, 1000); // Обновляем каждую секунду

      return () => clearInterval(interval);  // Очищаем интервал при размонтировании компонента
    }
  }, [isSubscribed, walletAddress]);  // Загрузка и обновление при изменении подписки или адреса кошелька

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
