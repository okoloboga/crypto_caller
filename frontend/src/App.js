import React from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import Dashboard from './pages/Dashboard';
import './App.css';

const App = () => {
  const walletAddress = useTonAddress();
  console.log(`Wallet address: ${walletAddress}`);

  return (
    <div>
      <Dashboard walletAddress={walletAddress} />      
    </div>
  );
};

export default App;
