import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { getUserByWalletAddress } from '../services/apiService';
import './PointsWidget.css';

const PointsWidget = ({ isSubscribed, showNotification }) => {
  const walletAddress = useTonAddress();
  const [points, setPoints] = useState(0); // Points
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to load points
  const loadPoints = async () => {
    if (!isSubscribed) {
      showNotification('Subscribe to start earning RUBLE.');
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

  // Automatic points update every 60 seconds
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
          showNotification('to start earning RUBLE.');
        }
      }}
    >
      {isSubscribed && lastUpdated && (
        <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
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
