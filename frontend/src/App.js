import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { LanguageProvider } from './contexts/LanguageContext';
import i18n from './i18n';
import { useTonConnect } from './hooks/useTonConnect';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { CssBaseline, Box } from '@mui/material';
import Dashboard from './pages/Dashboard';
import background from './assets/background.mp4';
const App = () => {
  const { walletAddress, connectionRestored } = useTonConnect();
  const { webApp, ready: webAppReady, viewportHeight, safeAreaInsets } = useTelegramWebApp();
  
  if (!connectionRestored) {
    return (
      <>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: viewportHeight ? `${viewportHeight}px` : '100vh',
            width: '100vw',
            backgroundColor: '#000000',
            margin: 0,
            padding: 0,
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            '@keyframes pulse': {
              '0%': {
                opacity: 0.6,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 1,
                transform: 'scale(1.05)',
              },
              '100%': {
                opacity: 0.6,
                transform: 'scale(1)',
              },
            },
            '& img': {
              animation: 'pulse 2s ease-in-out infinite',
              maxWidth: '120px',
              maxHeight: '120px',
            },
          }}
        >
          <img 
            src="/icon.png" 
            alt="Loading" 
            style={{
              width: '120px',
              height: '120px',
            }}
          />
        </Box>
      </>
    );
  }

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          margin: 0,
          padding: 0,
            height: viewportHeight ? `${viewportHeight}px` : '100vh',
          overflow: 'hidden',
            paddingTop: safeAreaInsets.top > 0 ? `${safeAreaInsets.top}px` : 0,
            paddingBottom: safeAreaInsets.bottom > 0 ? `${safeAreaInsets.bottom}px` : 0,
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
            objectFit: 'cover',
            zIndex: -1,
          }}
        >
          <source src={background} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: -1,
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