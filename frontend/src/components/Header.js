/**
 * Header component for the RUBLE Farming App.
 * This component renders a navigation bar at the top of the app.
 * It includes buttons for subscription, TON wallet connection, and language switching.
 * The header integrates with TON Connect for wallet authentication and supports internationalization.
 */

import React, { useState, useEffect } from 'react';

// Import custom TonConnect hook
import { useTonConnect } from '../hooks/useTonConnect';

// Import the TON Connect button component
import { TonConnectButton } from '@tonconnect/ui-react';

// Import language context for managing the app's language
import { useLanguage } from '../contexts/LanguageContext';

// Import translation hook for internationalization
import { useTranslation } from 'react-i18next';

// Import Material-UI components for layout and styling
import { Button, List, ListItem, Box } from '@mui/material';

/**
 * Header component that renders a navigation bar with subscription, wallet connection, and language switch buttons.
 * @param {Object} props - The component props.
 * @param {Function} props.showNotification - Function to display a notification message.
 * @param {Function} props.handleSubscribe - Function to handle subscription button click.
 * @param {Function} props.setHasTonProof - Function to update the TON proof status.
 * @returns {JSX.Element} The rendered Header component.
 */
const Header = ({ showNotification, handleSubscribe, setHasTonProof }) => {
  // Translation hook for internationalization
  const { t } = useTranslation();

  // Use custom TonConnect hook for simplified wallet management
  const { walletAddress, hasTonProof } = useTonConnect();

  // Access the current language and function to change it
  const { language, changeLanguage } = useLanguage();

  // Update parent component when TON proof status changes
  useEffect(() => {
    setHasTonProof(hasTonProof);
  }, [hasTonProof, setHasTonProof]);

  /**
   * Handle language change by toggling between English and Russian.
   */
  const handleLanguageChange = () => {
    const newLanguage = language === 'en' ? 'ru' : 'en';
    changeLanguage(newLanguage);
  };

  return (
    <Box
      component="header" // Note: The component is labeled as "footer" in the code, but it should be "header"
      sx={{
        backgroundColor: '#1a1a1a',
        padding: "8px",
        height: "60px",
        textAlign: 'center',
        marginTop: 'auto',
        zIndex: 1,
      }}
    >
      <nav>
        <List
          sx={{
            display: 'flex',
            justifyContent: 'center',
            padding: 0,
            margin: 0,
            gap: 3,
          }}
        >
          {/* Subscription button */}
          <ListItem sx={{ 
            padding: 0, 
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}> 
            <Button 
              onClick={handleSubscribe} // Trigger subscription action
              variant="text"
              color="secondary"
            >
              ME {/* Note: This should likely be a translated string like t('subscribe') */}
            </Button>
          </ListItem>

          {/* TON wallet connection button */}
          <ListItem sx={{ 
            padding: 0, 
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <TonConnectButton />
          </ListItem>

          {/* Language switch button */}
          <ListItem sx={{ 
            padding: 0, 
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Button onClick={handleLanguageChange} variant="text" color="secondary">
              {language === 'en' ? 'EN' : 'RU'} {/* Display current language */}
            </Button>
          </ListItem>
        </List>
      </nav>
    </Box>
  );
};

// Export the Header component as the default export
export default Header;