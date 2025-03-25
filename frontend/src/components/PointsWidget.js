/**
 * PointsWidget component for the RUBLE Farming App.
 * This component displays a progress bar for token farming (points accumulation).
 * Users can accumulate points over time up to a maximum of 50, and claim them to their TON wallet
 * when the maximum is reached. The component also handles user activity detection to pause/resume
 * point accumulation and saves progress to the server.
 */

import React, { useEffect, useState } from 'react';

// Import hook to retrieve the TON wallet address
import { useTonAddress } from '@tonconnect/ui-react';

// Import API service functions for token withdrawal and points updating
import { requestTokenWithdrawal, updatePoints } from '../services/apiService';

// Import translation hook for internationalization
import { useTranslation } from 'react-i18next';

// Import Material-UI components for layout and styling
import { Box, LinearProgress, Paper } from '@mui/material';

// Import the app logo for display on the progress bar
import logoSmall from '../assets/logoSmall.png';

/**
 * PointsWidget component that manages token farming and displays a progress bar.
 * @param {Object} props - The component props.
 * @param {boolean} props.isSubscribed - Indicates if the user is subscribed.
 * @param {Function} props.showNotification - Function to display a notification message.
 * @param {number} props.totalPoints - The total points accumulated by the user.
 * @param {number} props.lastPoints - The last recorded points value.
 * @param {Date} props.lastUpdated - The timestamp of the last points update.
 * @param {Function} props.updatePointsData - Function to update points data (totalPoints, lastPoints, lastUpdated).
 * @returns {JSX.Element} The rendered PointsWidget component.
 */
const PointsWidget = ({ showNotification, totalPoints, lastPoints, lastUpdated, updatePointsData }) => {
  // Translation hook for internationalization
  const { t } = useTranslation();

  // Retrieve the TON wallet address
  const walletAddress = useTonAddress();

  // State for local points tracking
  const [localLastPoints, setLastPoints] = useState(lastPoints);
  const [localTotalPoints, setTotalPoints] = useState(totalPoints);

  // State to track user activity (active/inactive)
  const [isActive, setIsActive] = useState(true);

  // Maximum points that can be accumulated before claiming
  const maxPoints = 100.000;

  // Detect user activity to pause/resume point accumulation
  useEffect(() => {
    /**
     * Handle user activity by setting the active state.
     */
    const handleUserActivity = () => {
      setIsActive(true);
    };

    // Set a timer to mark the user as inactive after 30 seconds of no activity
    const inactivityTimer = setTimeout(() => {
      setIsActive(false);
    }, 30000);

    // Add event listeners for user activity (mouse movement and keypress)
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);

    // Cleanup: Remove event listeners and clear the timer on unmount
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
    };
  }, []);

  // Increment points periodically when the user has a wallet address
  useEffect(() => {
    if (!walletAddress) return;

    // Increment points every second
    const interval = setInterval(() => {
      incrementPoints();
    }, 1000);

    // Initial increment on mount
    incrementPoints();

    // Cleanup: Clear the interval on unmount
    return () => clearInterval(interval);
  }, [walletAddress, lastUpdated]);

  // Update points based on elapsed time since last update
  useEffect(() => {
    if (lastUpdated && !isNaN(new Date(lastUpdated).getTime())) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / 1000;
      const accumulationRate = 0.001;
      const newPoints = Math.min(localLastPoints + timeElapsed * accumulationRate, maxPoints);
      setLastPoints(newPoints);

      // Save progress to the server if the user is inactive and points have changed significantly
      if (!isActive && Math.abs(newPoints - localLastPoints) >= 1) {
        saveProgressToServer(newPoints);
      }
    }
  }, [lastUpdated]);

  // Sync local total points with the prop value
  useEffect(() => {
    setTotalPoints(totalPoints);
  }, [totalPoints]);

  // Sync local last points with the prop value
  useEffect(() => {
    setLastPoints(lastPoints);
  }, [lastPoints]);

  // Determine if the progress bar is full and calculate the progress percentage
  const isFull = localLastPoints >= maxPoints;
  const progressValue = isFull ? 100 : (localLastPoints / maxPoints) * 100;

  /**
   * Save the current points progress to the server.
   * @param {number} newPoints - The new points value to save.
   */
  const saveProgressToServer = async (newPoints) => {
    try {
      await updatePoints(walletAddress, newPoints);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  /**
   * Handle progress bar click to claim points.
   * If the maximum points are reached, the points are claimed and sent to the user's wallet.
   */
  const handleProgressBarClick = async () => {
    if (localLastPoints < maxPoints) {
      showNotification(t('notFull')); // Notify if the progress bar is not full
      return;
    }

    if (localLastPoints >= maxPoints) {
      try {
        console.log(`Claiming points: ${localLastPoints}`);
        await requestTokenWithdrawal(walletAddress, maxPoints); // Send tokens to the wallet
        await updatePoints(walletAddress, 0);
        const newTotalPoints = 0;

        // Reset points after claiming
        setTotalPoints(newTotalPoints);
        setLastPoints(0);

        // Update parent component with new points data
        updatePointsData(newTotalPoints, 0, new Date());
        showNotification(t('pointsClaimed')); // Notify success
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError')); // Notify error
      }
    }
  };

  /**
   * Increment points based on elapsed time since the last update.
   * Points accumulate at a rate of 0.001 per second up to the maximum.
   */
  const incrementPoints = () => {
    console.log('incrementPoints called, lastUpdated:', lastUpdated);
    if (lastUpdated && !isNaN(new Date(lastUpdated).getTime())) {
      const now = Date.now();
      const timeElapsed = (now - new Date(lastUpdated).getTime()) / 1000;
      const accumulationRate = 0.001;
      const newPoints = Math.min(localLastPoints + timeElapsed * accumulationRate, maxPoints);

      console.log(`Last Update: ${new Date(lastUpdated)}, localLastPoints: ${localLastPoints}, New points: ${newPoints}`);

      setLastPoints(newPoints);

      // Save progress to the server if the user is inactive and points have changed significantly
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
      {/* Progress bar for points accumulation */}
      <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={handleProgressBarClick}>   
        {/* Linear progress bar showing points accumulation */}
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
        {/* Text overlay showing points or "COLLECT" when full */}
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

// Export the PointsWidget component as the default export
export default PointsWidget;