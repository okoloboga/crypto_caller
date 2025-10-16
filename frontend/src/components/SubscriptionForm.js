/**
 * SubscriptionForm component for the RUBLE Farming App.
 * This component allows users to subscribe to the service by paying 0.75 TON and providing a phone number.
 * It handles subscription creation, phone number updates, and TON wallet authentication with challenge verification.
 * The form supports editing the phone number if the user is already subscribed.
 */

import React, { useState, useEffect } from 'react';

// Import TON Connect hooks for wallet integration
import { useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// Import TON SDK for creating proper message payloads
import { beginCell } from '@ton/core';

// Import API service functions for user data, subscription, and challenge verification
import { getUserByWalletAddress, updatePhoneNumber, getSubscriptionConfig, checkSubscription, getChallenge, verifyChallenge, notifySubscriptionTransaction } from '../services/apiService';

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

  // Check if wallet has TON proof when wallet changes
  useEffect(() => {
    if (walletAddress && wallet?.connectItems?.tonProof) {
      console.log('✅ SubscriptionForm: TON Proof available');
    }
  }, [walletAddress, wallet]);

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
   * Validates phone number, verifies wallet, fetches subscription contract details,
   * and sends a transaction to the smart contract to activate the subscription.
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

      // 1. Fetch subscription configuration from the backend
      const config = await getSubscriptionConfig();
      console.log('🔍 DEBUG: Config received from API:', config);
      console.log('🔍 DEBUG: Contract address:', config.contractAddress);
      console.log('🔍 DEBUG: Price from config:', config.price);
      console.log('🔍 DEBUG: Price type:', typeof config.price);
      
      if (!config.contractAddress || !config.price) {
        throw new Error('Failed to get subscription config from backend.');
      }
      
      const priceFloat = parseFloat(config.price);
      const amountNanoTON = priceFloat * 10**9;
      const amountString = amountNanoTON.toString();
      
      console.log('🔍 DEBUG: Price parsed as float:', priceFloat);
      console.log('🔍 DEBUG: Amount in nanoTON:', amountNanoTON);
      console.log('🔍 DEBUG: Amount as string:', amountString);
      
      // 2. Create proper Subscribe message payload using TON SDK
      // Subscribe message has opcode 0x01 and no other data
      const subscribeCell = beginCell()
        .storeUint(0x01, 32) // Subscribe opcode
        .storeUint(0, 64)    // Query ID (optional, using 0)
        .endCell();
      
      const subscribePayload = subscribeCell.toBoc().toString('base64');
      
      console.log('🔍 DEBUG: Subscribe payload (base64):', subscribePayload);
      
      // 3. Define the transaction for the smart contract
      const txSubscription = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: config.contractAddress,
            amount: amountString, // Convert price to nanoTON
            payload: subscribePayload, // Proper Subscribe message
          },
        ],
      };
      
      console.log('🔍 DEBUG: Transaction object:', JSON.stringify(txSubscription, null, 2));

      // 3. (Optional but good practice) Verify wallet ownership via TON Proof
      const challenge = await getChallenge(walletAddress);
      const tonProof = await connectWalletWithProof(challenge);
      const isValid = await verifyChallenge(walletAddress, tonProof, wallet.account);
      if (!isValid) {
        throw new Error('TON Proof failed verification.');
      }
      
      // 4. Update phone number on the backend BEFORE payment
      await updatePhoneNumber(walletAddress, newPhoneNumber);

      // 5. Send the transaction to the smart contract
      console.log(`🔍 DEBUG: Sending transaction to contract: ${config.contractAddress}`);
      console.log('🔍 DEBUG: Final transaction before sending:', JSON.stringify(txSubscription, null, 2));
      console.log('🔍 DEBUG: Amount being sent:', txSubscription.messages[0].amount, 'nanoTON');
      console.log('🔍 DEBUG: Amount in TON:', (parseInt(txSubscription.messages[0].amount) / 10**9), 'TON');
      console.log('🔍 DEBUG: TON Connect UI state:', tonConnectUI);
      console.log('🔍 DEBUG: Wallet info:', wallet);
      console.log('🔍 DEBUG: User agent:', navigator.userAgent);
      console.log('🔍 DEBUG: Wallet open method:', wallet?.openMethod);
      
      try {
        // Show different messages based on platform and open method
        if (wallet?.openMethod === 'qrcode' && !navigator.userAgent.includes('Telegram')) {
          showNotification(t('browserTransactionInfo') || 'Please check your Telegram app or scan QR code if it appears');
          
          // Try to open Telegram app if possible
          setTimeout(() => {
            if (wallet?.universalLink) {
              console.log('🔗 Trying to open Telegram app:', wallet.universalLink);
              window.open(wallet.universalLink, '_blank');
            }
          }, 1000);
        }
        
        const result = await tonConnectUI.sendTransaction(txSubscription);
        console.log('🔍 DEBUG: Transaction result:', result);
        
        // 6. Notify backend about the successful transaction
        console.log('🔍 DEBUG: Notifying backend about transaction completion...');
        try {
          await notifySubscriptionTransaction(
            walletAddress,
            newPhoneNumber,
            result.boc, // Transaction hash/BOC
            config.price // Amount in TON
          );
          console.log('✅ Backend notified successfully about transaction');
        } catch (backendError) {
          console.error('❌ Failed to notify backend:', backendError);
          // Don't throw error - transaction was successful, backend notification is optional
        }
        
      } catch (error) {
        console.error('🔍 DEBUG: Transaction error:', error);
        
        // Provide helpful error messages based on the error
        if (error.message.includes('User declined')) {
          showNotification(t('transactionDeclined') || 'Transaction was declined');
        } else if (error.message.includes('qrcode') || wallet?.openMethod === 'qrcode') {
          showNotification(t('openTelegramApp') || 'Please open your Telegram app to confirm the transaction');
        } else {
          showNotification(t('transactionError') || 'Transaction failed. Please try again.');
        }
        
        throw error;
      }
      
      showNotification(t('transactionSuccess')); // "Transaction sent successfully!"
      
      // 7. Close the form and trigger the parent component to start polling for status change
      onSubscriptionChange(true); // This will now signal the Dashboard to start polling
      onCancel(); // Close the subscription form

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