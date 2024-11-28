import React, { useState, useEffect } from 'react';
import { TonConnect } from '@tonconnect/sdk';
import { useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { getUserByWalletAddress, updatePhoneNumber, createSubscription,
         checkSubscription, getChallenge, verifyChallenge } from '../services/apiService';
import './SubscriptionForm.css';

const SubscriptionForm = ({ onBack }) => {
  const [tonConnectUI, setOptions] = useTonConnectUI();
  const tonConnect = new TonConnect();
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
        setNotification('Connect your TON wallet.');
        return;
      }

      try {
        const user = await getUserByWalletAddress(walletAddress);
        const subscribeIsActive = await checkSubscription(walletAddress);
        if (user) {
          setPhoneNumber(user.phoneNumber || '');
          setIsSubscribed(subscribeIsActive);
        } else if (!hasShownNotification) {
          setNotification('User not found.');
          setHasShownNotification(true);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setNotification('Error loading data.');
      }
    };

    fetchUserData();
  }, [walletAddress]);

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
      showNotification('Please enter a new phone number.');
      return;
    }

    if (!walletAddress) {
      showNotification('Connect your TON wallet.');
      return;
    }

    try {
      await updatePhoneNumber(walletAddress, newPhoneNumber);
      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setIsEditing(false);
      showNotification('Phone number updated successfully.');
    } catch (error) {
      console.error('Error updating phone number:', error);
      showNotification('Update failed. Please try again.');
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
      showNotification('Please enter a new phone number.');
      return;
    }
  
    if (!validatePhoneNumber(newPhoneNumber)) {
      showNotification('Invalid phone number. Please check the format.');
      return;
    }
  
    if (!walletAddress) {
      throw new Error('Wallet is not connected.');
    }
  
    try {
      ensureWalletConnected();
      showNotification('Starting the registration process...');
      console.log('Connected wallet:', walletAddress);
  
      const txSubscription = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        network: 'testnet',
        messages: [
          {
            address: process.env.TON_WALLET || '0QC7IwY6zozwv_neAK1VJsBWcv_M-yd8nC_HVmB_DLVQmkY7',
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
  
      showNotification('TON Proof successfully verified.');
      
      console.log('Sending transaction...');
      await tonConnectUI.sendTransaction(txSubscription);
      console.log('Transaction completed successfully.');
      showNotification('Transaction completed successfully.');

      console.log('Registering subscription on the server...');
      await createSubscription(walletAddress, newPhoneNumber, tonProof);
      setIsSubscribed(true);
      console.log('Subscription successfully activated.');
      showNotification('Subscription successfully activated.');
    } catch (error) {
      console.error('Error in handleRegister:', error);
      showNotification('Activation failed. Please try again.');
    }
  };

  return (
    <div className="subscription-form">
      {isSubscribed ? (
        isEditing ? (
          <div>
            <p>Editing phone number:</p>
            <input
              type="text"
              value={newPhoneNumber || phoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              placeholder="Enter new phone number"
            />
            <button onClick={handleSave}>Save</button>
          </div>
        ) : (
          <div>
            <p>Subscription active on number: {phoneNumber}</p>
            <button onClick={() => setIsEditing(true)}>Edit Number</button>
          </div>
        )
      ) : (
        <div>
          <h4>Registration</h4>
          <p>To use the service, you need to enter your phone number and pay for the subscription. The phone number will be used for notifications about trigger activation. The subscription costs 1 TON per month.</p>
          <input
            type="text"
            value={newPhoneNumber}
            onChange={(e) => setNewPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
          />
          <button onClick={handleRegister}>Pay</button>
        </div>
      )}
      <button onClick={onBack}>Back</button>
      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default SubscriptionForm;
