import React, { useState } from 'react';
import tonService from '../services/tonService';
import './Login.css';

const Login = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleConnectWallet = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const wallet = await tonService.connectWallet();
      if (wallet) {
        onLogin(wallet); // Передаем данные кошелька в родительский компонент
      }
    } catch (error) {
      if (error.message && error.message.includes('Wallet was not connected')) {
        // Пользователь просто закрыл окно, не показываем сообщение об ошибке
        console.warn('Подключение кошелька было отменено пользователем.');
      } else {
        console.error('Ошибка подключения TON кошелька:', error);
        setErrorMessage('Не удалось подключить кошелек. Попробуйте снова.');
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <h1>RUBLE Caller</h1>
      <p>Пожалуйста, подключите ваш TON-кошелек, чтобы продолжить.</p>
      <button onClick={handleConnectWallet} disabled={loading}>
        {loading ? 'Подключение...' : 'Подключить TON-кошелек'}
      </button>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
};

export default Login;
