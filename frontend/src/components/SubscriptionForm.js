import React, { useState, useEffect } from 'react';
import { TonConnect } from '@tonconnect/sdk';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { getUserByWalletAddress, updatePhoneNumber, createSubscription,
        checkSubscription, getChallenge, verifyChallenge } from '../services/apiService';
import './SubscriptionForm.css';

const SubscriptionForm = ({ onBack }) => {
  const [tonConnectUI, setOptions] = useTonConnectUI();
  const tonConnect = new TonConnect();
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
        setNotification('Подключите TON кошелек.');
        return;
      }

      try {
        const user = await getUserByWalletAddress(walletAddress);
        const subscribeIsActive = await checkSubscription(walletAddress);
        if (user) {
          setPhoneNumber(user.phoneNumber || '');
          setIsSubscribed(subscribeIsActive);
        } else if (!hasShownNotification) {
          setNotification('Пользователь не найден.');
          setHasShownNotification(true);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        setNotification('Ошибка загрузки данных.');
      }
    };

    fetchUserData();
  }, [walletAddress]);

  const ensureWalletConnected = () => {
    if (!walletAddress) {
      throw new Error('Кошелек не подключен.');
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleSave = async () => {
    if (!newPhoneNumber) {
      showNotification('Введите новый номер телефона.');
      return;
    }

    if (!walletAddress) {
      showNotification('Подключите TON кошелек.');
      return;
    }

    try {
      await updatePhoneNumber(walletAddress, newPhoneNumber);
      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setIsEditing(false);
      showNotification('Номер телефона успешно обновлен.');
    } catch (error) {
      console.error('Ошибка обновления номера телефона:', error);
      showNotification('Ошибка обновления. Попробуйте снова.');
    }
  };

  const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^(\+7|7|8)?[\s-]?(\d{3})[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})$/;
    return phoneRegex.test(phoneNumber);
  };

  const connectWalletWithProof = async (challenge) => {
    console.log('Запуск connectWalletWithProof');
    try {
      // Настройка параметров подключения с tonProof
      tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: {
          tonProof: {
            payload: challenge, // Ваш challenge от сервера
          },
        },
      });
      
      console.log('Параметры подключения установлены:', tonConnectUI.setConnectRequestParameters);

      // Проверяем подключение
      const account = tonConnectUI.account;
      console.log('Подключение кошелька...', account);
      if (!account) {
        throw new Error('Кошелек не подключен.');
      }
  
      // Извлекаем подписанный TON Proof
      const tonProof = account.tonProof;
      if (!tonProof) {
        throw new Error('TON Proof не предоставлен кошельком.');
      }
  
      console.log('TON Proof успешно получен:', tonProof);
      return tonProof; // Возвращаем полный объект tonProof
    } catch (error) {
      console.error('Ошибка получения TON Proof:', error);
      throw error;
    }
  };
  
  const handleRegister = async () => {
    console.log('Запуск handleRegister');
    if (!newPhoneNumber) {
      showNotification('Введите новый номер телефона.');
      return;
    }
  
    if (!validatePhoneNumber(newPhoneNumber)) {
      showNotification('Некорректный номер телефона. Проверьте формат.');
      return;
    }
  
    if (!walletAddress) {
      throw new Error('Кошелёк не подключён.');
    }
  
    try {
      ensureWalletConnected();
      showNotification('Начинаем процесс регистрации...');
      console.log('Подключённый кошелек:', walletAddress);
  
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
  
      console.log('Отправка транзакции...');
      await tonConnectUI.sendTransaction(txSubscription);
      console.log('Транзакция успешно выполнена.');
      showNotification('Транзакция успешно выполнена.');
  
      console.log('Получение challenge...');
      const challenge = await getChallenge(walletAddress);
      console.log('Полученный challenge:', challenge);
      showNotification('Получение challenge для подписания...');
  
      console.log('Запуск connectWalletWithProof с challenge:', challenge);
      const tonProof = await connectWalletWithProof(challenge);
      console.log('Полученный TON Proof:', tonProof);
      showNotification('Подключение кошелька с TON Proof...');
  
      console.log('Проверка TON Proof на сервере...');
      const isValid = await verifyChallenge(walletAddress, tonProof);
      console.log('Результат проверки TON Proof:', isValid);
  
      if (!isValid) {
        throw new Error('TON Proof не прошёл проверку.');
      }
  
      showNotification('TON Proof успешно проверен.');
  
      console.log('Регистрация подписки на сервере...');
      await createSubscription(walletAddress, newPhoneNumber, tonProof);
      setIsSubscribed(true);
      console.log('Подписка успешно активирована.');
      showNotification('Подписка успешно активирована.');
    } catch (error) {
      console.error('Ошибка в handleRegister:', error);
      showNotification('Ошибка активации. Попробуйте снова.');
    }
  };

  return (
    <div className="subscription-form">
      {isSubscribed ? (
        isEditing ? (
          <div>
            <p>Редактирование номера телефона:</p>
            <input
              type="text"
              value={newPhoneNumber || phoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              placeholder="Введите новый номер телефона"
            />
            <button onClick={handleSave}>Сохранить</button>
          </div>
        ) : (
          <div>
            <p>Подписка активна на номер: {phoneNumber}</p>
            <button onClick={() => setIsEditing(true)}>Редактировать Номер</button>
          </div>
        )
      ) : (
        <div>
          <h4>Регистрация</h4>
          <p>Чтобы пользоваться сервисом, необходимо ввести номер телефона и оплатить подписку. Номер телефона будет использован для оповещений о срабатывании триггера. Стоимость подписки — 1 TON в месяц.</p>
          <input
            type="text"
            value={newPhoneNumber}
            onChange={(e) => setNewPhoneNumber(e.target.value)}
            placeholder="Введите номер телефона"
          />
          <button onClick={handleRegister}>Оплатить</button>
        </div>
      )}
      <button onClick={onBack}>Назад</button>
      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default SubscriptionForm;
