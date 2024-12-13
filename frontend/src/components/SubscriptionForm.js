// src/components/SubscriptionForm.js
import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { getUserByWalletAddress, updatePhoneNumber, createSubscription,
         checkSubscription, getChallenge, verifyChallenge } from '../services/apiService';
import { useTranslation } from 'react-i18next'; // Импортируем хук useTranslation
import { Box, Button, TextField, Typography, Paper, Snackbar, Alert } from '@mui/material';

const SubscriptionForm = ({ onBack, onSubscriptionChange }) => {
  const { t } = useTranslation(); // Получаем функцию для перевода
  const [tonConnectUI, setOptions] = useTonConnectUI();
  const wallet = useTonWallet();
  const walletAddress = useTonAddress();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [notification, setNotification] = useState('');
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    const fetchChallenge = async () => {
      if (walletAddress) {
        const fetchedChallenge = await getChallenge(walletAddress);
        setChallenge(fetchedChallenge);
      }
    };

    fetchChallenge();
  }, [walletAddress]); // Получаем challenge при изменении walletAddress

  useEffect(() => {
    if (walletAddress && challenge) {
      setTimeout(async () => {
        const tonProof = await connectWalletWithProof(challenge);
        console.log('TON Proof:', tonProof);
      }, 500);
    }
  }, [walletAddress, challenge]); // Реализуем подпись с использованием challenge

  useEffect(() => {
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

  useEffect(() => {
    if (walletAddress) {
      setTimeout(async () => {
        const tonProof = await connectWalletWithProof(challenge);
        console.log('TON Proof:', tonProof);
      }, 500);  // Задержка в 2000ms, чтобы убедиться, что данные полностью загружены
    }
  }, [walletAddress]);

  const ensureWalletConnected = () => {
    if (!walletAddress) {
      throw new Error('Wallet is not connected.');
    }
  };

  const showNotification = (message) => {
    setNotification(message);  // Устанавливаем текст уведомления
    setOpen(true);  // Показываем Snackbar

    setTimeout(() => {
      setNotification('');
      setOpen(false);  // Скрываем уведомление после 3 секунд
    }, 2000);  // Уведомление скрывается через 3 секунды
  };

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

  const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^(\+7|7|8)?[\s-]?(\d{3})[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})$/;
    return phoneRegex.test(phoneNumber);
  };

  const refreshPayload = async (challenge) => {
    tonConnectUI.setConnectRequestParameters({ state: "loading" });

    if (challenge) {
      tonConnectUI.setConnectRequestParameters({
        state: "ready",
        value: { tonProof: challenge },
      });
    } else {
      tonConnectUI.setConnectRequestParameters(null);
    };
  };

  const connectWalletWithProof = async (challenge) => {
    console.log('Starting connectWalletWithProof with challenge:', challenge);
    try {
      console.log('Waiting for TonProof...');
      await refreshPayload(challenge);
      console.log('Refreshing payload completed');
      
      // Добавить задержку
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
      showNotification(t('registrationProcess'));
      console.log('Connected wallet:', walletAddress);

      const txSubscription = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        network: 'testnet',
        messages: [
          {
            address: process.env.TON_WALLET || '0QC7IwY6zozwv_neAK1VJsBWcv_M-yd8nC_HVmB_DLVQmkY7', // 'UQDIkS1d_Lhd7EDttTtcmr9Xzg78uEMDEsYFde-PZCgfoOtU', // 
            amount: "1000000", // 0.001 TON
          },
        ],
      };

      const challenge = await getChallenge(walletAddress);
      const tonProof = await connectWalletWithProof(challenge);
      console.log('Received TON Proof:', tonProof, 'For wallet:', walletAddress);

      const isValid = await verifyChallenge(walletAddress, tonProof, wallet.account);
      console.log('TON Proof verification result:', isValid);

      if (!isValid || isValid === false) {
        throw new Error('TON Proof failed verification.');
      }

      showNotification(t('tonProofSuccess'));

      console.log('Sending transaction...');
      await tonConnectUI.sendTransaction(txSubscription);
      console.log('Transaction completed successfully.');
      showNotification(t('transactionSuccess'));

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
            <Box>
              <Typography variant="body1">{t('enterNewPhoneNumber')}:</Typography>
              <TextField
                fullWidth
                type="text"
                value={newPhoneNumber || phoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder={t('enterNewPhoneNumber')}
                variant="outlined"
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
            <Box>
              <Typography variant="body1">{t('subscriptionActive', { phoneNumber })}</Typography>
              <Button
                sx={{ marginTop: 2 }}
                onClick={() => setIsEditing(true)}
                variant="contained"
              >
                {t('editNumber')}
              </Button>
            </Box>
          )
        ) : (
          <Box>
            <Typography variant="h6">{t('registrationProcess')}</Typography>
            <Typography variant="body2">{t('subscriptionDescription')}</Typography>
            <TextField
              fullWidth
              type="text"
              value={newPhoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              placeholder={t('enterPhoneNumber')}
              variant="outlined"
              sx={{
                marginTop: 2,
                borderRadius: '12px',
                backgroundColor: "#383838",
                }}
            />
            <Button
              sx={{ marginTop: 2 }}
              onClick={handleRegister}
              variant="contained"
            >
              {t('payForSubscription')}
            </Button>
          </Box>
        )}
        
        <Button
          onClick={onBack}
          sx={{ marginTop: 3 }}
          variant="contained"
        >
          {t('back')}
        </Button>

        {/* Сообщение с уведомлением */}
        <Snackbar
          open={open}
          autoHideDuration={2000} // Уведомление будет скрываться через 3 секунды
          onClose={() => setOpen(false)}  // Закрываем уведомление вручную
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Позиция уведомления
          sx={{
            borderRadius: 2,
            marginBottom: '70px', // Добавляем отступ снизу, чтобы переместить его выше
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

export default SubscriptionForm;
