import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { TonConnectUIProvider, TonConnect } from '@tonconnect/ui-react';

const App = () => {
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    // Проверяем состояние кошелька при первом рендере
    const checkWallet = async () => {
      const connectedWallet = await TonConnect.getWallet();
      if (connectedWallet) {
        setWallet(connectedWallet); // Если кошелек уже подключен, обновляем состояние
      }
    };

    checkWallet();  // Проверяем подключение при загрузке
  }, []);

  const handleLogin = async () => {
    // Инициируем подключение через TonConnect
    await TonConnect.connect();
    const walletData = await TonConnect.getWallet();
    console.log('Кошелек подключён:', walletData);
    setWallet(walletData); // Сохраняем данные кошелька в состояние
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
