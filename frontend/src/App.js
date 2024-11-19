import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

const App = () => {
  const [wallet, setWallet] = useState(null);


  const handleLogin = (walletData) => {
    console.log('Кошелек успешно подключен:', walletData);
    setWallet(walletData); // Устанавливаем данные авторизованного кошелька
  };

  return (
    <TonConnectUIProvider manifestUrl="https://caller.ruble.website/manifest.json">
      <div>
        {!wallet && <Login onLogin={handleLogin} />}
        {wallet && <Dashboard wallet={wallet} onLogin={handleLogin} />}
      </div>
    </TonConnectUIProvider>
  );
};

export default App;
