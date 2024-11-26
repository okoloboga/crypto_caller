import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { getUserByWalletAddress } from '../services/apiService';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification }) => {
  const walletAddress = useTonAddress();
  const [points, setPoints] = useState(0); // Очки
  const [lastUpdated, setLastUpdated] = useState(null);

  // Функция для загрузки очков
  const loadPoints = async () => {
    if (!isSubscribed) {
      showNotification('Оформи подписку, чтобы зарабатывать RUBLE.');
      return;
    }
    try {
      const user = await getUserByWalletAddress(walletAddress); // TypeError: undefined has no properties
      const userPoints = user.points;
      setPoints(userPoints);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Ошибка при загрузке очков:', err);
    }
  };

  // Автоматическое обновление очков каждые 60 секунд
  useEffect(() => {
    if (isSubscribed) {
      loadPoints();
      const interval = setInterval(loadPoints, 60000);
      return () => clearInterval(interval);
    }
  }, [isSubscribed]);

  return (
    <div
      className={`points-widget ${!isSubscribed ? 'blocked' : ''}`}
      onClick={() => {
        if (!isSubscribed) {
          showNotification('чтобы зарабатывать RUBLE.');
        }
      }}
    >
      {isSubscribed && lastUpdated && (
        <p>Последнее обновление: {lastUpdated.toLocaleTimeString()}</p>
      )}
      <div className="progress-container" style={{ position: 'relative', display: 'inline-block' }}>
        <progress value={points} max={50}></progress>
        <div className="progress-overlay">
          {points} / 50
        </div>
      </div>
      <h3>RUBLE: {isSubscribed ? points : 0}</h3>
    </div>
  );
};

export default PointsWidget;
