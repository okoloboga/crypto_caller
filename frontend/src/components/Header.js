import React, { useState } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import './Header.css';

const Header = ({ onNavigate }) => {
    const walletAddress = useTonAddress();
    const [notification, setNotification] = useState('');
    const { language, changeLanguage } = useLanguage();

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
