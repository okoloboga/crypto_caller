import React, { useState, useEffect } from 'react';
import { checkSubscription, createSubscription, cancelSubscription } from './subscriptionService';
import './SubscriptionForm.css';

const SubscriptionForm = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { isActive, phoneNumber } = await checkSubscription();
        setIsSubscribed(isActive);
        setPhoneNumber(phoneNumber || '');
      } catch (error) {
        console.error('Ошибка проверки подписки:', error);
      }
    };

    fetchStatus();
  }, []);

  const handleSubscribe = async () => {
    try {
      await createSubscription('+1234567890');
      setIsSubscribed(true);
      setPhoneNumber('+1234567890');
    } catch (error) {
      console.error('Ошибка оформления подписки:', error);
    }
  };


  return (
    <div>
      {isSubscribed ? (
        <div>
          <p>Подписка активна на номер: {phoneNumber}</p>
          <button onClick={handleCancel}>Отменить подписку</button>
        </div>
      ) : (
        <div>
          <p>Подписка не активна.</p>
          <button onClick={handleSubscribe}>Оформить подписку</button>
        </div>
      )}
    </div>
  );
};

export default SubscriptionForm;
