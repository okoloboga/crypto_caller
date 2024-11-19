import React from 'react';
import { TonConnectUIProvider, useTonAddress } from '@tonconnect/ui-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const App = () => {
  const walletAddress = useTonAddress(); // Получаем адрес кошелька

  return (
    <TonConnectUIProvider manifestUrl="https://caller.ruble.website/manifest.json">
      <div>
        <Login /> {/* Показываем Login, если адреса нет */}
        {walletAddress && <Dashboard walletAddress={walletAddress} />} {/* Показываем Dashboard, если адрес есть */}
      </div>
    </TonConnectUIProvider>
  );
};

export default App;
