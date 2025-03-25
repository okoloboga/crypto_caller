/**
 * SubscriptionForm component for the RUBLE Farming App.
 * This component allows users to subscribe to the service by paying 0.75 TON and providing a phone number.
 * It handles subscription creation, phone number updates, and TON wallet authentication with challenge verification.
 * The form supports editing the phone number if the user is already subscribed.
 */

import React, { useState, useEffect } from 'react';

// Import TON Connect hooks for wallet integration
import { useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// Import API service functions for user data, subscription, and challenge verification
import { getUserByWalletAddress, updatePhoneNumber, createSubscription, checkSubscription, getChallenge, verifyChallenge } from '../services/apiService';

// Import translation hook for internationalization
import { useTranslation } from 'react-i18next';

// Import Material-UI components for layout, styling, and notifications
import { Box, Button, TextField, Typography, Paper, Snackbar, Alert } from '@mui/material';

/**
 * SubscriptionForm component for managing user subscriptions.
 * @param {Object} props - The component props.
 * @param {Function} props.onCancel - Function to handle canceling the subscription form.
 * @param {Function} props.onSubscriptionChange - Function to update the subscription status in the parent component.
 * @returns {JSX.Element} The rendered SubscriptionForm component.
 */
const SubscriptionForm = ({ onCancel, onSubscriptionChange }) => {
  // Translation hook for internationalization
  const { t } = useTranslation();

  // TON Connect UI instance and options setter
  const [tonConnectUI, setOptions] = useTonConnectUI();

  // Retrieve the TON wallet object and address
  const wallet = useTonWallet();
  const walletAddress = useTonAddress();

  // State for subscription status, phone number, and notifications
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [notification, setNotification] = useState('');
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);
  const [challenge, setChallenge] = useState(null);

  // Fetch the challenge for wallet verification when the wallet address changes
  useEffect(() => {
    /**
     * Fetch the challenge for TON proof verification.
     */
    const fetchChallenge = async () => {
      if (walletAddress) {
        const fetchedChallenge = await getChallenge(walletAddress);
        setChallenge(fetchedChallenge);
      }
    };

    fetchChallenge();
  }, [walletAddress]);

  // Sign the challenge with TON proof when the wallet address and challenge are available
  useEffect(() => {
    if (walletAddress && challenge) {
      setTimeout(async () => {
        const tonProof = await connectWalletWithProof(challenge);
        console.log('TON Proof:', tonProof);
      }, 500);
    }
  }, [walletAddress, challenge]);

  // Fetch user data and subscription status when the wallet address changes
  useEffect(() => {
    /**
     * Fetch user data and subscription status.
     */
    const fetchUserData = async () => {
      if (!walletAddress) {
        setNotification(t('connectWallet'));
        return;
      }

      try {
        const user = await getUserByWalletAddress(walletAddress);
        const subscribeIsActive = await checkSubscription(walletAddress);
        if (user) {
          setPhoneNumber(user.phoneNumber || '');
          setIsSubscribed(subscribeIsActive);
        } else if (!hasShownNotification) {
          setNotification(t('userNotFound'));
          setHasShownNotification(true);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setNotification(t('errorLoadingData'));
      }
    };

    fetchUserData();
  }, [walletAddress, t, hasShownNotification]);

  // Re-sign the challenge with TON proof after a delay when the wallet address changes
  useEffect(() => {
    if (walletAddress) {
      setTimeout(async () => {
        const tonProof = await connectWalletWithProof(challenge);
        console.log('TON Proof:', tonProof);
      }, 500); // Delay to ensure data is fully loaded
    }
  }, [walletAddress]);

  /**
   * Ensure the wallet is connected, throwing an error if not.
   * @throws {Error} If the wallet is not connected.
   */
  const ensureWalletConnected = () => {
    if (!walletAddress) {
      throw new Error('Wallet is not connected.');
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
    }, 3000); // Hide notification after 3 seconds
  };

  /**
   * Handle saving a new phone number for an existing subscription.
   */
  const handleSave = async () => {
    if (!newPhoneNumber) {
      showNotification(t('enterPhoneNumber'));
      return;
    }

    if (!walletAddress) {
      showNotification(t('connectWallet'));
      return;
    }

    try {
      await updatePhoneNumber(walletAddress, newPhoneNumber);
      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setIsEditing(false);
      showNotification(t('phoneNumberUpdated'));
    } catch (error) {
      console.error('Error updating phone number:', error);
      showNotification(t('updateFailed'));
    }
  };

  /**
   * Validate a phone number using a regular expression.
   * @param {string} phoneNumber - The phone number to validate.
   * @returns {boolean} True if the phone number is valid, false otherwise.
   */
  const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^(\+7|7|8)?[\s-]?(\d{3})[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})$/;
    return phoneRegex.test(phoneNumber);
  };

  /**
   * Refresh the TON Connect payload with a new challenge.
   * @param {string|null} challenge - The challenge string for TON proof.
   */
  const refreshPayload = async (challenge) => {
    tonConnectUI.setConnectRequestParameters({ state: "loading" });

    if (challenge) {
      tonConnectUI.setConnectRequestParameters({
        state: "ready",
        value: { tonProof: challenge },
      });
    } else {
      tonConnectUI.setConnectRequestParameters(null);
    }
  };

  /**
   * Connect the wallet with TON proof for verification.
   * @param {string} challenge - The challenge string to sign.
   * @returns {Promise<string>} The TON proof string.
   * @throws {Error} If TON proof is not provided by the wallet.
   */
  const connectWalletWithProof = async (challenge) => {
    console.log('Starting connectWalletWithProof with challenge:', challenge);
    try {
      console.log('Waiting for TonProof...');
      await refreshPayload(challenge);
      console.log('Refreshing payload completed');

      // Add a delay to ensure the wallet is ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Getting wallet', wallet);
      console.log(wallet.connectItems?.tonProof);

      if (wallet.connectItems?.tonProof && !('error' in wallet.connectItems.tonProof)) {
        const tonProof = wallet.connectItems.tonProof;
        console.log('TON Proof successfully received:', tonProof);
        return tonProof;
      } else {
        throw new Error('TON Proof not provided by wallet.');
      }
    } catch (error) {
      console.error('Error obtaining TON Proof:', error);
      throw error;
    }
  };

  /**
   * Handle the subscription registration process.
   * Validates the phone number, processes the payment (0.75 TON), verifies the TON proof,
   * and creates the subscription on the server.
   */
  const handleRegister = async () => {
    console.log('Starting handleRegister');
    if (!newPhoneNumber) {
      showNotification(t('enterPhoneNumber'));
      return;
    }

    if (!validatePhoneNumber(newPhoneNumber)) {
      showNotification(t('invalidPhoneNumber'));
      return;
    }

    if (!walletAddress) {
      throw new Error('Wallet is not connected.');
    }

    try {
      ensureWalletConnected();
      console.log('Connected wallet:', walletAddress);

      // Define the transaction for subscription payment (0.75 TON)
      const txSubscription = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        network: 'mainnet',
        messages: [
          {
            address: process.env.TON_WALLET || 'UQB26VtCk8H5o23Gk_fW80wCncY-kcWQ4LBEx6PDabmi5CLh',
            amount: "750000000", // 0.75 TON in nanoTON
          },
        ],
      };

      // Fetch and sign the challenge for TON proof
      const challenge = await getChallenge(walletAddress);
      const tonProof = await connectWalletWithProof(challenge);
      console.log('Received TON Proof:', tonProof, 'For wallet:', walletAddress);

      // Verify the TON proof
      const isValid = await verifyChallenge(walletAddress, tonProof, wallet.account);
      console.log('TON Proof verification result:', isValid);

      if (!isValid || isValid === false) {
        throw new Error('TON Proof failed verification.');
      }

      // Send the transaction for payment
      console.log('Sending transaction...');
      await tonConnectUI.sendTransaction(txSubscription);
      console.log('Transaction completed successfully.');
      showNotification(t('transactionSuccess'));

      // Register the subscription on the server
      console.log('Registering subscription on the server...');
      await createSubscription(walletAddress, newPhoneNumber, tonProof);
      setIsSubscribed(true);
      console.log('Subscription successfully activated.');
      showNotification(t('subscriptionActivated'));
      onSubscriptionChange(true);
    } catch (error) {
      console.error('Error in handleRegister:', error);
      showNotification(t('activationFailed'));
    }
  };

  return (
    <Paper sx={{ 
      padding: 3, 
      borderRadius: 8, 
      boxShadow: 3, 
      margin: 1,
    }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isSubscribed ? (
          isEditing ? (
            // Form for editing the phone number
            <Box>
              <Typography variant="body1">{t('enterNewPhoneNumber')}:</Typography>
              <TextField
                fullWidth
                type="text"
                value={newPhoneNumber || phoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder={t('enterNewPhoneNumber')}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: "#383838",
                }}
              />
              <Button
                sx={{ marginTop: 2 }}
                onClick={handleSave}
                variant="contained"
              >
                {t('save')}
              </Button>
            </Box>
          ) : (
            // Display current subscription status and edit option
            <Box>
              <Typography variant="body1">{t('subscriptionActive', { phoneNumber })}</Typography>
              <Button
                sx={{ marginTop: 2 }}
                onClick={() => setIsEditing(true)}
                color="secondary"
                variant="contained"
              >
                {t('editNumber')}
              </Button>
            </Box>
          )
        ) : (
          // Form for new subscription
          <Box>
            <Box display="flex" justifyContent="center" alignItems="flex-start" height="auto">
              <Typography variant="h6" style={{ textAlign: 'center' }}>
                {t('registrationProcess')}
              </Typography>
            </Box>
            <Typography variant="body2" align="justify">
              {t('subscriptionDescription')}
            </Typography>
            <TextField
              fullWidth
              type="text"
              value={newPhoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              placeholder={t('enterPhoneNumber')}
              sx={{
                marginTop: 2,
                borderRadius: '16px',
                backgroundColor: "#383838",
              }}
            />
            <Button
              sx={{ marginTop: 2 }}
              onClick={handleRegister}
              variant="contained"
              color="secondary"
            >
              {t('payForSubscription')}
            </Button>
          </Box>
        )}
        
        {/* Cancel button to close the form */}
        <Button
          onClick={onCancel}
          sx={{ marginTop: 2 }}
          variant="contained"
          color="secondary"
        >
          {t('back')}
        </Button>

        {/* Notification snackbar for user feedback */}
        <Snackbar
          open={open}
          autoHideDuration={3000}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            borderRadius: 2,
            marginBottom: '70px',
          }}
        >
          <Alert onClose={() => setOpen(false)} severity="error" sx={{ width: '100%' }}>
            {notification}
          </Alert>
        </Snackbar>
      </Box>
    </Paper>
  );
};

// Export the SubscriptionForm component as the default export
export default SubscriptionForm;