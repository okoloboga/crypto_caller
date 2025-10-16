import React, { useState, useEffect, useCallback } from 'react';
import { useTonConnect } from '../hooks/useTonConnect';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import Footer from '../components/Footer';
import PointsWidget from '../components/PointsWidget';
import SubscriptionForm from '../components/SubscriptionForm';
import { getUserTasks, deleteTask, checkSubscriptionFromContract, getUserByWalletAddress } from '../services/apiService';
import { Box, Snackbar, Alert } from '@mui/material';
const Dashboard = () => {
  // Use custom TonConnect hook for simplified wallet management
  const { walletAddress, hasTonProof } = useTonConnect();

  // Translation hook for internationalization
  const { t } = useTranslation();

  // Language context to access the current language
  const { } = useLanguage();

  // State to track subscription status
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPolling, setIsPolling] = useState(false); // State for polling subscription status

  // State to store the user's tasks
  const [tasks, setTasks] = useState([]);

  // State to toggle the subscription form visibility
  const [onSubscription, setOnSubscription] = useState(false);

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
    if (status === true) {
      showNotification(t('checkingSubscriptionStatus')); // Inform user
      setIsPolling(true);
    }
  };

  // Set the document title on component mount
  useEffect(() => {
    document.title = "RUBLE CALLER";
  }, []);

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
    if (storedLastUpdated) {
      setLastUpdated(new Date(storedLastUpdated));
    } else {
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
    console.log('Updating points data:', newTotalPoints, newLastPoints, newLastUpdated);
    setTotalPoints(newTotalPoints);
    setLastPoints(newLastPoints);
    setLastUpdated(newLastUpdated);
    localStorage.setItem('lastPoints', newLastPoints.toString());
    localStorage.setItem('totalPoints', newTotalPoints.toString());
    localStorage.setItem('lastUpdated', newLastUpdated.toISOString());
    fetchUserData();
  }, []);

  /**
   * Fetch user data from the backend using the wallet address.
   * Updates points and last updated timestamp based on the response.
   */
  const fetchUserData = async () => {
    try {
      const response = await getUserByWalletAddress(walletAddress);
      if (response === false) {
        console.log('User not found');
        setTotalPoints(0);
        setLastPoints(0);
        setLastUpdated(new Date());
        localStorage.setItem('totalPoints', '0');
        localStorage.setItem('lastUpdated', new Date().toISOString());
      } else {
        console.log('Received user:', response);
        const lastUpdated = response.lastUpdated ? new Date(response.lastUpdated) : new Date();
        setTotalPoints(response.points);
        setLastPoints(response.lastPoints);
        setLastUpdated(isValidDate(lastUpdated) ? lastUpdated : new Date());
        localStorage.setItem('totalPoints', response.points);
        localStorage.setItem('lastUpdated', lastUpdated.toISOString());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLastUpdated(new Date());
      localStorage.setItem('totalPoints', '0');
      localStorage.setItem('lastUpdated', new Date().toISOString());
    }
  };

  /**
   * Check the user's subscription status directly from blockchain contract.
   * This is the primary method for subscription verification.
   */
  const checkSubscriptionStatus = async () => {
    if (!walletAddress) return;
    try {
      const result = await checkSubscriptionFromContract(walletAddress);
      // Check if the expiry timestamp is in the future
      const isNowSubscribed = result && result.expiresAt && (result.expiresAt * 1000 > Date.now());
      
      if (isNowSubscribed) {
        if (isPolling) {
          showNotification(t('subscriptionActivated'));
        }
        setIsSubscribed(true);
        setIsPolling(false); // Stop polling on success
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error checking subscription status from contract:', error);
      setIsSubscribed(false);
      if (isPolling) {
        setIsPolling(false); // Stop polling on error
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
    } catch (error) {
      console.error('Error deleting task:', error);
      showNotification(t('taskDeleteFail'));
    }
  };

  /**
   * Handle subscription button click.
   * Shows a notification if the wallet is not connected or TON proof is missing.
   */
  const handleSubscribe = () => {
    if (!walletAddress) {
      showNotification(t('connectWallet'));
      setTimeout(() => showNotification(''), 2000);
    } else if (!hasTonProof) {
      showNotification(t('tryConnection'));
      setTimeout(() => showNotification(''), 2000);
    } else {
      setOnSubscription(true);
    }
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

        {/* Subscription form (shown if onSubscription is true) */}
        {onSubscription ? (
          <SubscriptionForm
            onCancel={() => setOnSubscription(false)}
            onSubscriptionChange={handleSubscriptionStatusChange}
          />
        ) : (
          <>
          </>
        )}

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