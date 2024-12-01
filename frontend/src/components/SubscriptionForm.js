// src/components/SubscriptionForm.js
import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { getUserByWalletAddress, updatePhoneNumber, createSubscription,
         checkSubscription, getChallenge, verifyChallenge } from '../services/apiService';
import { useTranslation } from 'react-i18next'; // Импортируем хук useTranslation
import './SubscriptionForm.css';

const SubscriptionForm = ({ onBack, onSubscriptionChange }) => {
  const { t } = useTranslation(); // Получаем функцию для перевода
  const [tonConnectUI, setOptions] = useTonConnectUI();
  const wallet = useTonWallet();
  const walletAddress = useTonAddress();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [notification, setNotification] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);

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

  const ensureWalletConnected = () => {
    if (!walletAddress) {
      throw new Error('Wallet is not connected.');
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
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

      await refreshPayload(challenge);
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
        network: 'mainnet', // 'testnet',
        messages: [
          {
            address: process.env.TON_WALLET || 'UQDIkS1d_Lhd7EDttTtcmr9Xzg78uEMDEsYFde-PZCgfoOtU', // '0QC7IwY6zozwv_neAK1VJsBWcv_M-yd8nC_HVmB_DLVQmkY7',
            amount: "1000000", // 0.001 TON
          },
        ],
      };

      const challenge = await getChallenge(wallet.account.address);
      const tonProof = await connectWalletWithProof(challenge);
      console.log('Received TON Proof:', tonProof, 'For wallet:', wallet.account.address);

      const isValid = await verifyChallenge(wallet.account, tonProof);
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
    <div className="subscription-form">
      {isSubscribed ? (
        isEditing ? (
          <div>
            <p>{t('enterNewPhoneNumber')}:</p>
            <input
              type="text"
              value={newPhoneNumber || phoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              placeholder={t('enterNewPhoneNumber')}
            />
            <button onClick={handleSave}>{t('save')}</button>
          </div>
        ) : (
          <div>
            <p>{t('subscriptionActive', { phoneNumber })}</p>
            <button onClick={() => setIsEditing(true)}>{t('editNumber')}</button>
          </div>
        )
      ) : (
        <div>
          <h4>{t('registrationProcess')}</h4>
          <p>{t('subscriptionDescription')}</p>
          <input
            type="text"
            value={newPhoneNumber}
            onChange={(e) => setNewPhoneNumber(e.target.value)}
            placeholder={t('enterPhoneNumber')}
          />
          <button onClick={handleRegister}>{t('payForSubscription')}</button>
        </div>
      )}
      <button onClick={onBack}>{t('back')}</button>
      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default SubscriptionForm;
