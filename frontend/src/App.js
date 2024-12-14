import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { LanguageProvider } from './contexts/LanguageContext';
import i18n from './i18n';
import { useTonAddress } from '@tonconnect/ui-react';
import { CssBaseline, Box } from '@mui/material';
import Dashboard from './pages/Dashboard';
import background from './assets/background.mp4';


const App = () => {
  const walletAddress = useTonAddress();
  console.log(`Wallet address: ${walletAddress}`);

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          margin: 0, // Убираем отступы
          padding: 0, // Убираем поля
          height: '100vh', // Убедитесь, что контейнер растягивается на весь экран
          overflow: 'hidden'
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover', // Видео будет растягиваться, сохраняя пропорции
            zIndex: -1,
          }}
        >
          <source src={background} type="video/mp4" />
          Ваш браузер не поддерживает видео.
        </video>

        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Затемняющий слой
            zIndex: -1, // Размещаем слой поверх видео
          }}
        />

        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <Dashboard walletAddress={walletAddress} />
          </LanguageProvider>
        </I18nextProvider>
      </Box>
    </>
  );
};

export default App;
