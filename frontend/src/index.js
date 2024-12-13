import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

const manifestUrl = "https://caller.ruble.website/manifest.json";

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </ThemeProvider>
  </React.StrictMode>
);