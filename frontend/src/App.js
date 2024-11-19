import React from 'react';
import { useTonAddress, TonConnectButton } from '@tonconnect/ui-react';
import Dashboard from './pages/Dashboard';

const App = () => {
  const walletAddress = useTonAddress(); // Получаем адрес кошелька
  console.log(`Wallet address: ${walletAddress}`);

  return (
    <div>
      <div className="center-button-container">
        <TonConnectButton className="tonconnect-button" />
      </div>
      <Dashboard walletAddress={walletAddress} />      
    </div>
  );
};

export default App;
