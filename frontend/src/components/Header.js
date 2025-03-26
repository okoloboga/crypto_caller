/**
 * Header component for the RUBLE Farming App.
 * This component renders a navigation bar at the top of the app.
 * It includes buttons for subscription, TON wallet connection, and language switching.
 * The header integrates with TON Connect for wallet authentication and supports internationalization.
 */

import React, { useState, useEffect } from 'react';

// Import TON Connect hooks for wallet integration
import { useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';

// Import the TON Connect button component
import { TonConnectButton } from '@tonconnect/ui-react';

// Import language context for managing the app's language
import { useLanguage } from '../contexts/LanguageContext';

// Import API service function to generate a challenge for wallet verification
import { getChallenge } from '../services/apiService';

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

  // Retrieve the TON wallet address
  const walletAddress = useTonAddress();

  // Retrieve the TON wallet object
  const wallet = useTonWallet();

  // Access the current language and function to change it
  const { language, changeLanguage } = useLanguage();

  // Access the TON Connect UI instance and options setter
  const [tonConnectUI, setOptions] = useTonConnectUI();

  // Effect to handle TON proof verification when wallet address or wallet changes
  useEffect(() => {
    /**
     * Refresh the TON Connect payload with a new challenge.
     * @param {string|null} challenge - The challenge string for TON proof.
     */
    const refreshPayload = async (challenge) => {
      tonConnectUI.setConnectRequestParameters({ state: "loading" });

      if (challenge) {
        tonConnectUI.setConnectRequestParameters({
          state: "ready",
          value: { tonProof: challenge },
        });
      } else {
        tonConnectUI.setConnectRequestParameters(null);
      }
    };

    /**
     * Check the TON proof for wallet verification.
     * Updates the hasTonProof state based on the verification result.
     */
    const checkTonProof = async () => {
      if (!walletAddress) return;

      const challenge = await getChallenge(walletAddress);

      try {
        await refreshPayload(challenge);

        if (wallet.connectItems?.tonProof) {
          console.log('TON Proof:', wallet.connectItems.tonProof);
          setHasTonProof(true);
        } else {
          setHasTonProof(false);
          setTimeout(() => showNotification(t('retryConnection')), 2000);
        }
      } catch (error) {
        console.error('Error checking tonProof:', error);
      }
    };

    const timer = setTimeout(() => {
      if (walletAddress && wallet) {
        checkTonProof();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [walletAddress, wallet, tonConnectUI]);

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