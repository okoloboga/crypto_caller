import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { LanguageProvider } from './contexts/LanguageContext';
import i18n from './i18n';
import { useTonAddress } from '@tonconnect/ui-react';
import { CssBaseline, Box } from '@mui/material';
import Dashboard from './pages/Dashboard';

const App = () => {
  const walletAddress = useTonAddress();
  console.log(`Wallet address: ${walletAddress}`);

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          backgroundColor: "#000000",
          margin: 0, // Убираем отступы
          padding: 0, // Убираем поля
          height: '100vh', // Убедитесь, что контейнер растягивается на весь экран
        }}
      >
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
