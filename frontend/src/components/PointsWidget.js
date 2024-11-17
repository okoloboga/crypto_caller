import React, { useEffect, useState } from 'react';
import { fetchUserPoints } from '../services/apiService';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification }) => {
  const [points, setPoints] = useState(0); // Очки
  const [lastUpdated, setLastUpdated] = useState(null); // Время последнего обновления

  // Функция для загрузки очков
  const loadPoints = async () => {
    if (!isSubscribed) {
      showNotification('Пожалуйста, авторизуйтесь и подпишитесь, чтобы накапливать очки.');
      return;
    }
    try {
      const userPoints = await fetchUserPoints();
      setPoints(userPoints);
      setLastUpdated(new Date()); // Устанавливаем текущее время как время обновления
    } catch (err) {
      console.error('Ошибка при загрузке очков:', err);
    }
  };

  // Автоматическое обновление очков каждые 60 секунд
  useEffect(() => {
    if (isSubscribed) {
      loadPoints();
      const interval = setInterval(loadPoints, 60000); // Обновление каждые 60 секунд
      return () => clearInterval(interval); // Очищаем интервал при размонтировании
    }
  }, [isSubscribed]);

  return (
    <div
      className={`points-widget ${!isSubscribed ? 'blocked' : ''}`}
      onClick={() => {
        if (!isSubscribed) {
          showNotification('Пожалуйста, авторизуйтесь и подпишитесь, чтобы накапливать очки.');
        }
      }}
    >
      <h3>Ваши накопленные очки: {isSubscribed ? points : 0}</h3>
      {!isSubscribed && <p>Скорость накопления: 0 очков/мин</p>}
      {isSubscribed && lastUpdated && (
        <p>Последнее обновление: {lastUpdated.toLocaleTimeString()}</p>
      )}
      <progress value={isSubscribed ? points : 0} max={100}></progress>
    </div>
  );
};

export default PointsWidget;
