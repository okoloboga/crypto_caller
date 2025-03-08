import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { requestTokenWithdrawal, updatePoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { Box, LinearProgress, Paper } from '@mui/material';
import { use } from 'i18next';
import logoSmall from '../assets/logoSmall.png';

const PointsWidget = ({ isSubscribed, showNotification, totalPoints, lastPoints, lastUpdated, updatePointsData }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [localLastPoints, setLastPoints] = useState(lastPoints);
  const [localTotalPoints, setTotalPoints] = useState(totalPoints);
  const [isActive, setIsActive] = useState(true);
  const maxPoints = 50.000;

  useEffect(() => {
    const handleUserActivity = () => {
      setIsActive(true);
    };
  
    const inactivityTimer = setTimeout(() => {
      setIsActive(false);
    }, 30000);
  
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
  
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
    };
  }, []);

  useEffect(() => {
    if (!isSubscribed || !walletAddress) return;
  
    const interval = setInterval(() => {
      incrementPoints();
    }, 1000);
  
    incrementPoints();
  
    return () => clearInterval(interval);
  }, [isSubscribed, walletAddress, lastUpdated]);

  useEffect(() => {
    if (lastUpdated && !isNaN(new Date(lastUpdated).getTime())) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / 1000;
      const accumulationRate = 0.001;
      const newPoints = Math.min(localLastPoints + timeElapsed * accumulationRate, maxPoints);
      setLastPoints(newPoints);

      if (!isActive && Math.abs(newPoints - localLastPoints) >= 1) {
        saveProgressToServer(newPoints);
      }
    }
  }, [lastUpdated]); 

  useEffect(() => {
    setTotalPoints(totalPoints);
  }, [totalPoints]); 

  useEffect(() => {
    setLastPoints(lastPoints);
  }, [lastPoints]);

  const isFull = localLastPoints >= maxPoints;
  const progressValue = isFull ? 100 : (localLastPoints / maxPoints) * 100;

  const saveProgressToServer = async (newPoints) => {
    try {
      await updatePoints(walletAddress, newPoints);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  const handleProgressBarClick = async () => {
    if (!isSubscribed) {
      showNotification(t('noSubscription'));
      return;
    }

    if (localLastPoints < maxPoints) {
      showNotification(t('notFull'));
      return;
    }
  
    if (localLastPoints >= maxPoints) {
      // showNotification(t('waitListing'));
      // return;
      try {
        console.log(`Claiming points: ${localLastPoints}`);
        await requestTokenWithdrawal(walletAddress, maxPoints);
        const newTotalPoints = localTotalPoints + localLastPoints;

        setTotalPoints(newTotalPoints);
        setLastPoints(0);

        updatePointsData(newTotalPoints, 0, new Date());
        showNotification(t('pointsClaimed'));
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError'));
      }
    }
  };

  const incrementPoints = () => {
    console.log('incrementPoints called, lastUpdated:', lastUpdated);
    if (lastUpdated && !isNaN(new Date(lastUpdated).getTime())) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / 1000;
      const accumulationRate = 0.001;
      const newPoints = Math.min(localLastPoints + timeElapsed * accumulationRate, maxPoints);
  
      console.log(`Last Update: ${new Date(lastUpdated)}, localLastPoints: ${localLastPoints}, New points: ${newPoints}`);
  
      setLastPoints(newPoints);
  
      if (!isActive && Math.abs(newPoints - localLastPoints) >= 1) {
        saveProgressToServer(newPoints);
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
            width: '40px',
            height: '40px',
            backgroundImage: logoSmall, 
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <LinearProgress
          variant="determinate"
          value={progressValue}
          color="inherit"
          sx={{
            height: '30px',
            borderRadius: 8,
            backgroundColor: '#000000',
            '& .MuiLinearProgress-bar': {
              backgroundColor: isFull ? '#ff55ba' : 'secondary.main',
              borderTopRightRadius: '16px',
              borderBottomRightRadius: '16px',
              boxShadow: isFull ? '0px 0px 15px 5px rgba(255, 85, 186, 0.8)' : 'none', 
              transition: 'box-shadow 0.3s ease',
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
          {isFull ? 'COLLECT' : `${localLastPoints.toFixed(3)} / ${maxPoints}`}
        </Box>
      </Box>
    </Paper>
  );
};

export default PointsWidget;
