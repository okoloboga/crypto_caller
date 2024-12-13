import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { LanguageProvider } from './contexts/LanguageContext';
import i18n from './i18n';
import { useTonAddress } from '@tonconnect/ui-react';
import Dashboard from './pages/Dashboard';

const App = () => {
  const walletAddress = useTonAddress();
  console.log(`Wallet address: ${walletAddress}`);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <Dashboard walletAddress={walletAddress} />
      </LanguageProvider>
    </I18nextProvider>
  );
};

export default App;
