import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const App = () => {
  const [wallet, setWallet] = useState(null);

  const handleLogin = (walletData) => {
    setWallet(walletData); // Устанавливаем данные авторизованного кошелька
  };

  return (
    <div>
      {!wallet && <Login onLogin={handleLogin} />}
      <Dashboard wallet={wallet} onLogin={handleLogin} />
    </div>
  );
};

export default App;
