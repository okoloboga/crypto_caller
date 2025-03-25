/**
 * Main application component for the RUBLE Farming App.
 * This component sets up the core layout, including a background video, and renders the Dashboard.
 * It integrates internationalization (i18n), language context, and TON wallet address retrieval.
 * The Dashboard is conditionally rendered based on the wallet address.
 */

// Import React for building the component
import React from 'react';

// Import I18nextProvider for internationalization support
import { I18nextProvider } from 'react-i18next';

// Import LanguageProvider to manage language context across the app
import { LanguageProvider } from './contexts/LanguageContext';

// Import i18n configuration for translations
import i18n from './i18n';

// Import hook to retrieve the TON wallet address
import { useTonAddress } from '@tonconnect/ui-react';

// Import Material-UI components for styling and layout
import { CssBaseline, Box } from '@mui/material';

// Import the Dashboard component, which contains the main app functionality
import Dashboard from './pages/Dashboard';

// Import the background video asset
import background from './assets/background.mp4';

/**
 * App component that serves as the root of the application.
 * It handles wallet address retrieval, sets up the background video, and renders the Dashboard.
 * @returns {JSX.Element} The rendered App component.
 */
const App = () => {
  // Retrieve the user's TON wallet address using the TonConnect hook
  const walletAddress = useTonAddress();
  console.log(`Wallet address: ${walletAddress}`);

  return (
    <>
      {/* CssBaseline ensures consistent styling across browsers */}
      <CssBaseline />

      {/* Main container for the app layout */}
      <Box
        sx={{
          margin: 0,
          padding: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Background video that plays automatically and loops */}
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

        {/* Overlay to darken the background video for better text visibility */}
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

        {/* Wrap the app in I18nextProvider for internationalization and LanguageProvider for language context */}
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            {/* Render the Dashboard component, passing the wallet address as a prop */}
            <Dashboard walletAddress={walletAddress} />
          </LanguageProvider>
        </I18nextProvider>
      </Box>
    </>
  );
};

// Export the App component as the default export
export default App;