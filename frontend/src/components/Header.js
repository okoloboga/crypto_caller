import React, { useState } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import './Header.css';

const Header = ({ onNavigate }) => {
    const walletAddress = useTonAddress();
    const [notification, setNotification] = useState('');

    const handleClick = () => {
        if (!walletAddress) {
            setNotification('Connect Wallet');
            setTimeout(() => setNotification(''), 3000);
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
