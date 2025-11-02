import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import process from 'process';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import telegramAnalytics from '@telegram-apps/analytics';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

// Set up polyfills after imports
window.Buffer = Buffer;
window.process = process;

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

// Export telegramAnalytics for use in components
export { telegramAnalytics };

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