import React, { useState } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <div className="login">
      <h1>RUBLE Caller</h1>
      <p>Пожалуйста, подключите ваш TON-кошелек, чтобы продолжить.</p>
      <TonConnectButton
        onConnect={onLogin} // Используем onLogin для начала подключения
        onError={(error) => {
          console.error('Ошибка подключения:', error);
        }}
      />
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
};

export default Login;
