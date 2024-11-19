import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { TonConnectUIProvider, useTonConnect } from '@tonconnect/ui-react';

const App = () => {
  const [wallet, setWallet] = useState(null);

  // Получаем объект TonConnect из контекста
  const { connect, disconnect, wallet: connectedWallet } = useTonConnect();

  useEffect(() => {
    if (connectedWallet) {
      // Если кошелек подключен, обновляем состояние
      console.log("Кошелек подключен:", connectedWallet);
      setWallet(connectedWallet);
    }
  }, [connectedWallet]); // Срабатывает, когда кошелек меняется

  const handleLogin = () => {
    connect();  // Инициализируем подключение
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
