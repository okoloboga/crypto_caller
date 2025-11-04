import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { requestTokenWithdrawal, updatePoints } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '../hooks/useAnalytics';
import { Box, LinearProgress, Paper } from '@mui/material';
const PointsWidget = ({ showNotification, totalPoints, lastPoints, lastUpdated, updatePointsData }) => {
  // Translation hook for internationalization
  const { t } = useTranslation();

  // Retrieve the TON wallet address
  const walletAddress = useTonAddress();

  // Analytics hook for tracking events
  const { trackEvent } = useAnalytics();

  // State for local points tracking
  const [localLastPoints, setLastPoints] = useState(lastPoints);
  const [, setTotalPoints] = useState(totalPoints);

  // Local lastUpdated state to prevent overwriting with stale server data
  const [localLastUpdated, setLocalLastUpdated] = useState(lastUpdated);

  // State to track user activity (active/inactive)
  const [isActive, setIsActive] = useState(true);
  
  // Ref to track if points were just reset (to prevent overwriting lastUpdated)
  const resetJustHappened = useRef(false);

  // Maximum points that can be accumulated before claiming
  const maxPoints = 1000;

  /**
   * Save the current points progress to the server.
   * @param {number} newPoints - The new points value to save.
   */
  const saveProgressToServer = useCallback(async (newPoints) => {
    try {
      await updatePoints(walletAddress, newPoints);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [walletAddress]);

  /**
   * Increment points based on elapsed time since the last update.
   * Points accumulate at a rate of 0.01 per 5 seconds up to the maximum.
   */
  const incrementPoints = useCallback(() => {
    // Use localLastUpdated instead of prop lastUpdated to prevent stale server data
    const effectiveLastUpdated = localLastUpdated || lastUpdated;
    
    if (!effectiveLastUpdated || isNaN(new Date(effectiveLastUpdated).getTime())) {
      console.warn('[PointsWidget] incrementPoints: Last updated time is null or invalid');
      return;
    }

    const now = Date.now();
    const lastUpdatedTime = new Date(effectiveLastUpdated).getTime();
    let timeElapsed = (now - lastUpdatedTime) / 5000; // Time difference in 5-second intervals
    
    // If points are very low and timeElapsed is large, reset lastUpdated to prevent huge jump
    if (localLastPoints < 1 && timeElapsed > 10) {
      console.warn(`[PointsWidget] Large timeElapsed (${timeElapsed}) with low points (${localLastPoints}). Resetting lastUpdated.`);
      setLocalLastUpdated(new Date());
      timeElapsed = 0.1; // Use minimal timeElapsed
    }
    
    // Log only every 10th call or if there's an issue
    const shouldLog = Math.random() < 0.1 || timeElapsed < 0 || timeElapsed > 720;
    if (shouldLog) {
      console.log(`[PointsWidget] incrementPoints: TimeElapsed=${timeElapsed.toFixed(4)}, localLastPoints=${localLastPoints.toFixed(4)}`);
    }

    // Protect against negative time (future dates)
    if (timeElapsed < 0) {
      console.warn(`[PointsWidget] Negative timeElapsed detected: ${timeElapsed}. Setting to 0.`);
      timeElapsed = 0;
    }
    
    // Limit maximum timeElapsed to prevent instant fill (max 1 hour = 720 intervals of 5 seconds)
    const maxTimeElapsed = 720; // 1 hour in 5-second intervals
    if (timeElapsed > maxTimeElapsed) {
      console.warn(`[PointsWidget] TimeElapsed too large: ${timeElapsed}. Limiting to ${maxTimeElapsed}.`);
      timeElapsed = maxTimeElapsed;
    }

    const accumulationRate = 0.01;
    const pointsToAdd = timeElapsed * accumulationRate;
    const newPoints = Math.min(localLastPoints + pointsToAdd, maxPoints);
    
    if (shouldLog) {
      console.log(`[PointsWidget] incrementPoints: Points to add=${pointsToAdd.toFixed(6)}, New points=${newPoints.toFixed(4)}`);
    }

    setLastPoints(newPoints);
    
    // Update localLastUpdated when points are added (to track accurate time)
    if (pointsToAdd > 0) {
      setLocalLastUpdated(new Date());
    }

    // Save progress to the server if the user is inactive and points have changed significantly
    if (!isActive && Math.abs(newPoints - localLastPoints) >= 1) {
      console.log(`[PointsWidget] Saving progress to server (user inactive): ${newPoints}`);
      saveProgressToServer(newPoints);
    }
  }, [localLastUpdated, lastUpdated, localLastPoints, maxPoints, isActive, saveProgressToServer]);

  /**
   * Handle progress bar click to claim points.
   * If the maximum points are reached, the points are claimed and sent to the user's wallet.
   */
  const handleProgressBarClick = useCallback(async () => {
    if (localLastPoints < maxPoints) {
      showNotification(t('notFull')); // Notify if the progress bar is not full
      return;
    }

    if (localLastPoints >= maxPoints) {
      try {
        console.log(`[PointsWidget] Claiming points: ${localLastPoints}`);
        await requestTokenWithdrawal(walletAddress, maxPoints); // Send tokens to the wallet
        await updatePoints(walletAddress, 0);
        const newTotalPoints = 0;
        const resetTime = new Date();

        // Reset points after claiming
        setTotalPoints(newTotalPoints);
        setLastPoints(0);
        setLocalLastUpdated(resetTime); // Set local lastUpdated immediately
        resetJustHappened.current = true; // Mark that reset just happened
        
        // Update parent component with new points data
        updatePointsData(newTotalPoints, 0, resetTime);
        
        // Track tokens claimed event
        trackEvent('tokens_claimed', {
          walletAddress: walletAddress || 'unknown',
          amount: maxPoints,
        });
        
        // Clear the reset flag after a delay (to prevent server data from overwriting)
        setTimeout(() => {
          resetJustHappened.current = false;
        }, 2000);
        
        showNotification(t('pointsClaimed')); // Notify success
      } catch (error) {
        console.error('Error claiming points:', error);
        showNotification(t('pointsClaimError')); // Notify error
      }
    }
  }, [localLastPoints, maxPoints, walletAddress, showNotification, t, updatePointsData, trackEvent]);

  // Detect user activity to pause/resume point accumulation
  useEffect(() => {
    let inactivityTimer = null;

    /**
     * Handle user activity by setting the active state and resetting the inactivity timer.
     */
    const handleUserActivity = () => {
      setIsActive(true);
      
      // Clear existing timer
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      // Set a new timer to mark the user as inactive after 30 seconds of no activity
      inactivityTimer = setTimeout(() => {
        setIsActive(false);
      }, 30000);
    };

    // Initial timer
    inactivityTimer = setTimeout(() => {
      setIsActive(false);
    }, 30000);

    // Add event listeners for user activity (mouse movement, keypress, click, scroll)
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Cleanup: Remove event listeners and clear the timer on unmount
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);

  // Increment points periodically when the user has a wallet address
  useEffect(() => {
    if (!walletAddress) return;

    // Increment points every 5 seconds
    const interval = setInterval(() => {
      incrementPoints();
    }, 5000);

    // Initial increment on mount
    incrementPoints();

    // Cleanup: Clear the interval on unmount
    return () => clearInterval(interval);
  }, [walletAddress, incrementPoints]);

  // Sync localLastPoints when lastUpdated prop changes (sync with server data)
  // But don't overwrite localLastUpdated if reset just happened
  useEffect(() => {
    if (!lastUpdated || isNaN(new Date(lastUpdated).getTime())) {
      console.log('[PointsWidget] useEffect lastUpdated: Last updated time is null or invalid');
      return;
    }

    // Don't overwrite localLastUpdated if reset just happened (to prevent stale server data)
    if (resetJustHappened.current) {
      console.log('[PointsWidget] useEffect lastUpdated: Reset just happened, skipping sync to prevent overwrite');
      return;
    }

    console.log(`[PointsWidget] useEffect lastUpdated triggered: lastUpdated=${lastUpdated.toISOString()}`);
    console.log(`[PointsWidget] useEffect lastUpdated: lastPoints prop=${lastPoints}`);
    
    // When lastUpdated changes (from server), sync localLastPoints with the prop value
    // This ensures we're in sync with server data, but we don't recalculate here
    // The calculation is done by incrementPoints() every 5 seconds
    // Use functional update to avoid dependency on localLastPoints
    setLastPoints((prevPoints) => {
      if (prevPoints !== lastPoints) {
        console.log(`[PointsWidget] useEffect lastUpdated: Syncing localLastPoints from ${prevPoints} to ${lastPoints}`);
        return lastPoints;
      }
      return prevPoints;
    });
    
    // Only sync localLastUpdated if it's significantly different (more than 1 minute)
    const serverTime = new Date(lastUpdated).getTime();
    const localTime = new Date(localLastUpdated || lastUpdated).getTime();
    const timeDiff = Math.abs(serverTime - localTime);
    
    if (timeDiff > 60000) { // More than 1 minute difference
      console.log(`[PointsWidget] useEffect lastUpdated: Syncing localLastUpdated from server (diff: ${timeDiff}ms)`);
      setLocalLastUpdated(new Date(lastUpdated));
    }
  }, [lastUpdated, lastPoints, localLastUpdated]); // Only depend on lastUpdated and lastPoints prop, NOT localLastPoints

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
