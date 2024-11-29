import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { getUserByWalletAddress } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [points, setPoints] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadPoints = async () => {
    if (!isSubscribed) {
      showNotification(t('subscribeToEarn'));
      return;
    }
    try {
      const user = await getUserByWalletAddress(walletAddress);
      const userPoints = user.points;
      setPoints(userPoints);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading points:', err);
    }
  };

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
          showNotification(t('subscribeToEarn'));
        }
      }}
    >
      {isSubscribed && lastUpdated && (
        <p>{t('lastUpdated', { time: lastUpdated.toLocaleTimeString() })}</p>
      )}
      <div className="progress-container" style={{ position: 'relative', display: 'inline-block' }}>
        <progress value={points} max={50}></progress>
        <div className="progress-overlay">
          {points} / 50
        </div>
      </div>
      <h3>{t('points')}: {isSubscribed ? points : 0}</h3>
    </div>
  );
};

export default PointsWidget;
