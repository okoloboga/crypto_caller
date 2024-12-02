import React, { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getChallenge } from '../services/apiService';
import './Header.css';

const Header = ({ onNavigate }) => {
  const walletAddress = useTonAddress();
  const wallet = useTonWallet();
  const [notification, setNotification] = useState('');
  const { language, changeLanguage } = useLanguage();
  const [tonConnectUI, setOptions] = useTonConnectUI();

  useEffect(() => {
    const refreshPayload = async (challenge) => {
      // Запускаем запрос на получение tonProof
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

    const checkTonProof = async () => {
      if (!walletAddress) return;

      // Получаем challenge или другие данные, если нужно
      const challenge = await getChallenge(walletAddress);

      try {
        // Запускаем refreshPayload для инициализации запроса
        await refreshPayload(challenge);

        // Проверяем наличие tonProof после вызова refreshPayload
        if (wallet.connectItems?.tonProof) {
          console.log('TON Proof:', wallet.connectItems.tonProof);
        } else {
          setNotification('TON Proof not provided. Please reconnect your wallet.');
          setTimeout(() => setNotification(''), 3000);
        }
      } catch (error) {
        console.error('Error checking tonProof:', error);
      }
    };

    checkTonProof();
  }, [walletAddress, wallet, tonConnectUI]); // Хуки на изменения адреса кошелька

  const handleClick = () => {
    if (!walletAddress) {
      setNotification('Connect Wallet');
      setTimeout(() => setNotification(''), 3000);
    } else {
      onNavigate('subscription');
    }
  };

  // Логика для переключения языка
  const handleLanguageChange = () => {
    const newLanguage = language === 'en' ? 'ru' : 'en';
    changeLanguage(newLanguage);
  };

  return (
    <header>
      <nav>
        <ul>
          <li>
            <button onClick={handleClick}>
              ME
            </button>
          </li>
          <li>
            <TonConnectButton />
          </li>
          <li>
            {/* Кнопка с текущим языком */}
            <button onClick={handleLanguageChange}>
              {language === 'en' ? 'EN' : 'RU'}
            </button>
          </li>
        </ul>
      </nav>

      {notification && <p className="notification">{notification}</p>}
    </header>
  );
};

export default Header;
