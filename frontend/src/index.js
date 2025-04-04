/**
 * Entry point of the React application.
 * This file sets up the root rendering of the app, integrating providers for TON Connect UI and Material-UI theme.
 * It renders the main `App` component within a strict mode for better error detection.
 */

// Import React and ReactDOM for rendering the application
import React from 'react';
import ReactDOM from 'react-dom/client';

// Import the main App component
import App from './App';

// Import TonConnectUIProvider to enable TON wallet integration
import { TonConnectUIProvider } from '@tonconnect/ui-react';

import telegramAnalytics from '@telegram-apps/analytics';

// Import ThemeProvider and the custom theme for Material-UI styling
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

// Define the manifest URL for TON Connect, which provides metadata for wallet integration
const manifestUrl = "https://caller.ruble.website/manifest.json";

// Init Telegram Analytics before application rendering
const analyticsToken = process.env.REACT_APP_ANALYTICS_RECORDING;
const appName = process.env.REACT_APP_RUBLE_CALLER;

if (!analyticsToken || !appName) {
  console.error('Analytics token or app name is not provided in .env file');
} else {
  telegramAnalytics.init({
      token: analyticsToken,
      appName: appName,
  });
  console.log('Telegram Analytics initialized successfully');
}

// Create a root element for rendering the React application
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the application with providers for TON Connect and Material-UI theme
root.render(
  <React.StrictMode>
    {/* ThemeProvider applies the custom Material-UI theme to the entire app */}
    <ThemeProvider theme={theme}>
      {/* TonConnectUIProvider enables TON wallet connection functionality */}
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        {/* Main App component that contains the core application logic */}
        <App />
      </TonConnectUIProvider>
    </ThemeProvider>
  </React.StrictMode>
);