import React, { useState, useEffect } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { getUserByWalletAddress, updatePhoneNumber } from '../services/apiService';
import './SubscriptionForm.css';

const SubscriptionForm = ({ onBack }) => {
  const walletAddress = useTonAddress(); // Получаем walletAddress
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState(''); // Для ввода нового номера телефона
  const [notification, setNotification] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Режим редактирования

  useEffect(() => {
    const fetchUserData = async () => {
      if (!walletAddress) {
        setNotification('Подключите TON кошелек.');
        return;
      }

      try {
        const user = await getUserByWalletAddress(walletAddress);
        if (user) {
          setPhoneNumber(user.phoneNumber || '');
          setIsSubscribed(user.subscriptionStatus === 'active'); // Проверяем статус подписки
        } else {
          setNotification('Пользователь не найден.');
        }
      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        setNotification('Ошибка загрузки данных.');
      }
    };

    fetchUserData();
  }, [walletAddress]);

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
      await updatePhoneNumber(walletAddress, newPhoneNumber); // Вызываем функцию для обновления номера
      setPhoneNumber(newPhoneNumber); // Обновляем номер телефона в состоянии
      setNewPhoneNumber(''); // Сбрасываем ввод нового номера
      setIsEditing(false); // Выходим из режима редактирования
      showNotification('Номер телефона успешно обновлен.');
    } catch (error) {
      console.error('Ошибка обновления номера телефона:', error);
      showNotification('Ошибка обновления. Попробуйте снова.');
    }
  };

  const handleCancel = () => {
    setNewPhoneNumber(''); // Сбрасываем ввод
    setIsEditing(false); // Выходим из режима редактирования
  };

  return (
    <div>
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
            <button onClick={handleCancel}>Отменить</button>
          </div>
        ) : (
          <div>
            <p>Подписка активна на номер: {phoneNumber}</p>
            <button onClick={() => setIsEditing(true)}>Редактировать Номер</button>
          </div>
        )
      ) : (
        <div>
          <p>Подписка не активна.</p>
        </div>
      )}
      <button onClick={onBack}>Назад</button>
      {notification && <p className="notification">{notification}</p>}
    </div>
  );
};

export default SubscriptionForm;
