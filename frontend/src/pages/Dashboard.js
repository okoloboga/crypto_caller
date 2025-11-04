import React, { useState, useEffect, useCallback } from 'react';
import { useTonConnect } from '../hooks/useTonConnect';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useBackButton } from '../hooks/useBackButton';
import { useAnalytics } from '../hooks/useAnalytics';
import Header from '../components/Header';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import Footer from '../components/Footer';
import PointsWidget from '../components/PointsWidget';
import SubscriptionForm from '../components/SubscriptionForm';
import SubscriptionPending from '../components/SubscriptionPending';
import { getUserTasks, deleteTask, checkSubscription, getUserByWalletAddress } from '../services/apiService';
import { Box, Snackbar, Alert } from '@mui/material';
  const Dashboard = () => {
    // Use custom TonConnect hook for simplified wallet management
    const { walletAddress, hasTonProof, isConnected, connectionRestored, isVerifying } = useTonConnect();

  // Translation hook for internationalization
  const { t } = useTranslation();

  // Analytics hook for tracking events
  const { trackEvent } = useAnalytics();

  // Language context to access the current language
  const { } = useLanguage();

  // State to track subscription status
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPolling, setIsPolling] = useState(false); // State for polling subscription status

  // State to store the user's tasks
  const [tasks, setTasks] = useState([]);

  // State to toggle the subscription form visibility
  const [onSubscription, setOnSubscription] = useState(false);
  
  // State to show pending subscription process
  const [isPendingSubscription, setIsPendingSubscription] = useState(false);
  
  // State to track if transaction is being sent
  const [isTransactionSending, setIsTransactionSending] = useState(false);

  // State to store the current task being edited or created
  const [currentTask, setCurrentTask] = useState(null);

  // State for available currency pairs for task creation
  const [currencyPairs] = useState(['BTC-USD', 'ETH-USD', 'TON-USD']);

  // State to track if TON proof is available for subscription (managed by useTonConnect hook)
  // const [hasTonProof, setHasTonProof] = useState(false); // Removed - now managed by useTonConnect

  // State for notification message and visibility
  const [notification, setNotification] = useState('');
  const [open, setOpen] = useState(false);

  // State for token farming (points) data
  const [totalPoints, setTotalPoints] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  /**
   * Handles the signal from the subscription form to start polling for status updates.
   * @param {boolean} status - A signal (true) to start polling.
   */
  const handleSubscriptionStatusChange = (status) => {
    console.log('handleSubscriptionStatusChange called with status:', status);
    if (status === true) {
      console.log('Starting subscription status polling...');
      showNotification(t('checkingSubscriptionStatus')); // Inform user
      setIsPolling(true);
      setIsPendingSubscription(true); // Show pending state
      setIsTransactionSending(false); // Transaction has been sent
      // Ensure subscription form is closed immediately to reveal pending overlay
      setOnSubscription(false);
      console.log('Subscription form closed, pending state activated');
    }
  };

  /**
   * Handles the start of transaction sending.
   * Shows pending state immediately when transaction starts.
   */
  const handleTransactionStart = () => {
    console.log('Transaction starting, showing pending state...');
    setIsTransactionSending(true);
    setIsPendingSubscription(true);
    setOnSubscription(false);
  };

  // Set the document title on component mount and track app opened event
  useEffect(() => {
    document.title = "RUBLE CALLER";
    trackEvent('app_opened', {
      walletAddress: walletAddress || 'not_connected',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only track once on mount

  // Fetch subscription status and user data when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      checkSubscriptionStatus();
      fetchUserData();
    }
  }, [walletAddress]);

  // Effect for polling the subscription status
  useEffect(() => {
    if (!isPolling || !walletAddress) return;

    const pollingId = setInterval(() => {
      console.log('Polling for subscription status...');
      checkSubscriptionStatus();
    }, 5000); // Poll every 5 seconds

    const timeoutId = setTimeout(() => {
      console.log('Polling timed out.');
      clearInterval(pollingId);
      setIsPolling(false);
      showNotification(t('subscriptionCheckTimeout'));
    }, 120000); // 2-minute timeout

    // Cleanup function to clear intervals and timeouts
    return () => {
      clearInterval(pollingId);
      clearTimeout(timeoutId);
    };
  }, [isPolling, walletAddress]);

  // Fetch tasks if the user is subscribed and has a wallet address
  useEffect(() => {
    if (walletAddress && isSubscribed) {
      fetchTasks();
    }
  }, [walletAddress, isSubscribed]);

  // Load total points from localStorage on mount
  useEffect(() => {
    const storedTotalPoints = localStorage.getItem('totalPoints');
    if (storedTotalPoints) {
      setTotalPoints(parseFloat(storedTotalPoints));
    }
  }, []);

  // Load last updated timestamp from localStorage on mount
  useEffect(() => {
    const storedLastUpdated = localStorage.getItem('lastUpdated');
    console.log(`[Dashboard] Loading lastUpdated from localStorage: ${storedLastUpdated}`);
    if (storedLastUpdated) {
      const parsedDate = new Date(storedLastUpdated);
      console.log(`[Dashboard] Parsed localStorage lastUpdated: ${parsedDate.toISOString()}, Valid: ${isValidDate(parsedDate)}`);
      if (isValidDate(parsedDate)) {
        setLastUpdated(parsedDate);
      } else {
        console.warn(`[Dashboard] Invalid date in localStorage, using current date`);
        setLastUpdated(new Date());
      }
    } else {
      console.log(`[Dashboard] No lastUpdated in localStorage, using current date`);
      setLastUpdated(new Date());
    }
  }, []);

  // Load last points from localStorage on mount
  useEffect(() => {
    const storedLastPoints = localStorage.getItem('lastPoints');
    if (storedLastPoints) {
      setLastPoints(parseFloat(storedLastPoints));
    }
  }, []);

  // Save total points to localStorage when they change
  useEffect(() => {
    if (totalPoints !== undefined) {
      localStorage.setItem('totalPoints', totalPoints.toString());
    }
  }, [totalPoints]);

  // Save last points to localStorage when they change
  useEffect(() => {
    if (lastPoints !== undefined) {
      localStorage.setItem('lastPoints', lastPoints.toString());
    }
  }, [lastPoints]);

  /**
   * Validate if a date is valid.
   * @param {Date} date - The date to validate.
   * @returns {boolean} True if the date is valid, false otherwise.
   */
  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date);
  };

  /**
   * Update points data (total points, last points, and last updated timestamp).
   * @param {number} newTotalPoints - The new total points value.
   * @param {number} newLastPoints - The new last points value.
   * @param {Date} newLastUpdated - The new last updated timestamp.
   */
  const updatePointsData = useCallback((newTotalPoints, newLastPoints, newLastUpdated) => {
    console.log('[Dashboard] updatePointsData called:', { newTotalPoints, newLastPoints, newLastUpdated });
    console.log(`[Dashboard] updatePointsData: newLastUpdated=${newLastUpdated}, Valid=${isValidDate(newLastUpdated)}`);
    
    const finalLastUpdated = isValidDate(newLastUpdated) ? newLastUpdated : new Date();
    console.log(`[Dashboard] updatePointsData: Setting lastUpdated to ${finalLastUpdated.toISOString()}`);
    
    setTotalPoints(newTotalPoints);
    setLastPoints(newLastPoints);
    setLastUpdated(finalLastUpdated);
    localStorage.setItem('lastPoints', newLastPoints.toString());
    localStorage.setItem('totalPoints', newTotalPoints.toString());
    localStorage.setItem('lastUpdated', finalLastUpdated.toISOString());
    
    // Only fetch user data if wallet address is available and points weren't just reset
    // Delay fetchUserData to prevent overwriting fresh reset data
    if (walletAddress && newLastPoints > 0) {
      console.log('[Dashboard] updatePointsData: Fetching user data from server (delayed)');
      // Delay to allow PointsWidget to set its local state first
      setTimeout(() => {
        fetchUserData();
      }, 1000);
    } else if (walletAddress && newLastPoints === 0) {
      console.log('[Dashboard] updatePointsData: Points reset to 0, skipping fetchUserData to prevent overwrite');
    }
  }, [walletAddress]);

  /**
   * Fetch user data from the backend using the wallet address.
   * Updates points and last updated timestamp based on the response.
   * Preserves local accumulation that hasn't been saved to server yet.
   */
  const fetchUserData = async () => {
    if (!walletAddress) {
      console.warn('fetchUserData called without walletAddress');
      return;
    }
    
    try {
      const response = await getUserByWalletAddress(walletAddress);
      if (response === false) {
        console.log('[Dashboard] User not found');
        // Only reset if local points are also 0 (no accumulation)
        setTotalPoints((prev) => prev || 0);
        setLastPoints((prev) => prev || 0);
        setLastUpdated(new Date());
        localStorage.setItem('totalPoints', '0');
        localStorage.setItem('lastUpdated', new Date().toISOString());
      } else {
        console.log('[Dashboard] Received user:', response);
        console.log(`[Dashboard] fetchUserData: Server points=${response.points}, lastPoints=${response.lastPoints}`);
        
        // Get current local values before overwriting (use functional updates)
        setLastPoints((currentLocalPoints) => {
          // Only update if server has more points (server is ahead)
          // This preserves local accumulation that hasn't been saved to server yet
          if (response.lastPoints > currentLocalPoints + 0.01) {
            console.log(`[Dashboard] fetchUserData: Server has more points (${response.lastPoints} > ${currentLocalPoints.toFixed(4)}), syncing`);
            // Update totalPoints separately
            setTotalPoints(response.points);
            localStorage.setItem('totalPoints', response.points);
            localStorage.setItem('lastPoints', response.lastPoints);
            return response.lastPoints;
          } else {
            console.log(`[Dashboard] fetchUserData: Keeping local points (${currentLocalPoints.toFixed(4)} >= ${response.lastPoints}), server data is stale`);
            // Keep local points, don't overwrite
            return currentLocalPoints;
          }
        });
        
        // For lastUpdated, use server value only if it's significantly newer
        const lastUpdated = response.lastUpdated ? new Date(response.lastUpdated) : new Date();
        const finalLastUpdated = isValidDate(lastUpdated) ? lastUpdated : new Date();
        
        setLastUpdated((currentLastUpdated) => {
          // Only update lastUpdated if server time is significantly newer (more than 1 minute)
          const serverTime = finalLastUpdated.getTime();
          const localTime = currentLastUpdated ? currentLastUpdated.getTime() : Date.now();
          const timeDiff = serverTime - localTime;
          
          if (timeDiff > 60000) {
            console.log(`[Dashboard] fetchUserData: Server lastUpdated is newer (diff: ${timeDiff}ms), updating`);
            localStorage.setItem('lastUpdated', finalLastUpdated.toISOString());
            return finalLastUpdated;
          } else {
            console.log(`[Dashboard] fetchUserData: Keeping local lastUpdated (diff: ${timeDiff}ms)`);
            // Keep local lastUpdated
            return currentLastUpdated || finalLastUpdated;
          }
        });
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching user data:', error);
      // Don't reset on error - preserve local state
      setLastUpdated((current) => current || new Date());
    }
  };

  /**
   * Check the user's subscription status from the backend.
   * The backend queries the blockchain contract for subscription status.
   */
  const checkSubscriptionStatus = async () => {
    if (!walletAddress) return;
    try {
      const result = await checkSubscription(walletAddress);
      // Check if the expiry timestamp is in the future
      const isNowSubscribed = result && result.expiresAt && (result.expiresAt * 1000 > Date.now());
      
      if (isNowSubscribed) {
        if (isPolling) {
          showNotification(t('subscriptionActivated'));
        }
        setIsSubscribed(true);
        setIsPolling(false); // Stop polling on success
        setIsPendingSubscription(false); // Hide pending state
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsSubscribed(false);
      if (isPolling) {
        setIsPolling(false); // Stop polling on error
        setIsPendingSubscription(false); // Hide pending state on error
      }
    }
  };

  /**
   * Fetch the user's tasks from the backend.
   * Updates the tasks state with the fetched tasks.
   */
  const fetchTasks = async () => {
    try {
      const fetchedTasks = await getUserTasks(walletAddress);
      if (fetchedTasks === undefined) {
        console.log('No tasks available');
      } else {
        setTasks(fetchedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  /**
   * Show a notification message to the user.
   * @param {string} message - The message to display.
   */
  const showNotification = (message) => {
    setNotification(message);
    setOpen(true);
    setTimeout(() => {
      setNotification('');
      setOpen(false);
    }, 3000);
  };

  /**
   * Handle saving a task (create or update).
   * Refetches tasks and clears the current task.
   */
  const handleSave = async () => {
    await fetchTasks();
    setCurrentTask(null);
  };

  /**
   * Handle deleting a task.
   * @param {string} taskId - The ID of the task to delete.
   */
  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      showNotification(t('taskDeleted'));
      
      // Track task deleted event
      trackEvent('task_deleted', {
        walletAddress: walletAddress || 'unknown',
        taskId: taskId,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      showNotification(t('taskDeleteFail'));
    }
  };

  /**
   * Handle subscription button click with improved wallet connection check.
   * Shows appropriate notifications based on wallet connection status.
   */
  const handleSubscribe = () => {
    console.log('handleSubscribe called:', { 
      walletAddress, 
      hasTonProof, 
      isConnected, 
      connectionRestored,
      isVerifying
    });
    
    // Проверяем, восстановлено ли соединение
    if (!connectionRestored) {
      showNotification(t('walletConnecting'));
      return;
    }
    
    // Проверяем, есть ли адрес кошелька
    if (!walletAddress) {
      showNotification(t('connectWallet'));
      return;
    }
    
    // Проверяем, подключен ли кошелек
    if (!isConnected) {
      showNotification(t('walletNotReady'));
      return;
    }
    
    // Проверяем, идет ли верификация
    if (isVerifying) {
      showNotification(t('waitingForProof'));
      return;
    }
    
    // Проверяем, есть ли TON Proof
    if (!hasTonProof) {
      showNotification(t('tryConnection'));
      return;
    }
    
    // Если все проверки пройдены, открываем форму подписки
    setOnSubscription(true);
  };

  /**
   * Handle creating a new task.
   * Shows a notification if the wallet is not connected or the user is not subscribed.
   */
  const handleCreateTask = () => {
    if (!walletAddress) {
      showNotification(t('tryConnection'));
    } else if (!isSubscribed) {
      showNotification(t('noSubscription'));
    } else {
      setCurrentTask({ currencyPair: 'BTC-USD', targetPrice: '0' });
    }
  };

  // Handle back button click - close forms and return to main screen
  const handleBackButton = () => {
    if (currentTask) {
      setCurrentTask(null);
    } else if (onSubscription) {
      setOnSubscription(false);
    }
  };

  // Manage BackButton visibility - show when in form mode
  useBackButton({
    onClick: handleBackButton,
    show: currentTask !== null || onSubscription,
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* Header with subscription and TON proof handling */}
      <Header
        showNotification={showNotification}
        handleSubscribe={handleSubscribe}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
        }}
      >
        {/* Points widget for token farming */}
        <Box sx={{ position: 'relative' }}>
          <PointsWidget
            isSubscribed={isSubscribed}
            showNotification={showNotification}
            totalPoints={totalPoints}
            lastPoints={lastPoints}
            lastUpdated={lastUpdated}
            updatePointsData={updatePointsData}
          />
        </Box>

        {/* Subscription form (shown if onSubscription is true and not pending) */}
        {onSubscription && !isPendingSubscription && !isTransactionSending ? (
          <SubscriptionForm
            onCancel={() => setOnSubscription(false)}
            onSubscriptionChange={handleSubscriptionStatusChange}
            onTransactionStart={handleTransactionStart}
          />
        ) : null}

        {/* Pending subscription process (shown when transaction is processing) */}
        {isPendingSubscription && <SubscriptionPending />}

        {/* Task form or task list (shown based on currentTask state) */}
        {currentTask ? (
          <TaskForm
            task={currentTask}
            currencyPairs={currencyPairs}
            onSave={handleSave}
            onCancel={() => setCurrentTask(null)}
          />
        ) : (
          <TaskList
            tasks={tasks}
            onEdit={setCurrentTask}
            onDelete={handleDelete}
          />
        )}

        {/* Notification snackbar for user feedback */}
        <Snackbar
          open={open}
          autoHideDuration={3000}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            borderRadius: 2,
            marginBottom: '140px',
          }}
        >
          <Alert onClose={() => setOpen(false)} severity="error" sx={{ width: '100%' }}>
            {notification}
          </Alert>
        </Snackbar>
      </Box>

      {/* Footer with task creation and subscription buttons */}
      <Footer
        showNotification={showNotification}
        handleCreateTask={handleCreateTask}
        handleSubscribe={handleSubscribe}
      />
    </Box>
  );
};

// Export the Dashboard component as the default export
export default Dashboard;