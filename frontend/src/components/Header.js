import React, { useState } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import './Header.css';

const Header = ({ onNavigate }) => {
    const walletAddress = useTonAddress();
    const [notification, setNotification] = useState(''); // Для уведомлений

    const handleClick = () => {
        if (!walletAddress) {
            setNotification('Подключи Кошелек'); // Устанавливаем уведомление
            setTimeout(() => setNotification(''), 3000); // Очищаем уведомление через 3 секунды
        } else {
            onNavigate('subscription');
        }
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
                </ul>
            </nav>
            {notification && <p className="notification">{notification}</p>}
        </header>
    );
};

export default Header;
