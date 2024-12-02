// src/components/Header.js
import React, { useState } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import './Header.css';

const Header = ({ onNavigate }) => {
    const walletAddress = useTonAddress();
    const [notification, setNotification] = useState('');
    const [showReconnect, setShowReconnect] = useState(false); // Для отображения кнопки переподключения
    const { language, changeLanguage } = useLanguage();

    // Функция для переподключения
    const handleReconnect = () => {
        // Пример простого способа инициировать reconnect
        if (walletAddress && walletAddress.disconnect) {
            walletAddress.disconnect();
        }
        setTimeout(() => {
            // Вызываем подключение снова
            setNotification('Please reconnect your wallet');
        }, 1000);
    };

    const handleClick = () => {
        if (!walletAddress) {
            setNotification('Connect Wallet');
            setTimeout(() => setNotification(''), 3000);
        } else {
            onNavigate('subscription');
        }
    };

    const handleLanguageChange = () => {
        const newLanguage = language === 'en' ? 'ru' : 'en';
        changeLanguage(newLanguage);
    };

    // Функция для обработки отсутствия tonProof
    const handleTonProofMissing = () => {
        setNotification('TON Proof not found, please reconnect your wallet.');
        setShowReconnect(true); // Показываем кнопку переподключения
    };

    // Эмулируем обработку ситуации, когда TON Proof отсутствует (например, в useEffect)
    React.useEffect(() => {
        if (walletAddress) {
            // Проверяем наличие tonProof (например, через wallet.connectItems)
            if (!walletAddress.connectItems?.tonProof) {
                handleTonProofMissing(); // Если нет tonProof, показываем кнопку переподключения
            }
        }
    }, [walletAddress]);

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
                        <button onClick={handleLanguageChange}>
                            {language === 'en' ? 'EN' : 'RU'}
                        </button>
                    </li>
                </ul>
            </nav>
            {notification && <p className="notification">{notification}</p>}
            {showReconnect && (
                <button onClick={handleReconnect} className="reconnect-button">
                    Reconnect Wallet
                </button>
            )}
        </header>
    );
};

export default Header;
