import React from 'react';
import { useTonConnect } from '../hooks/useTonConnect';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Button, List, ListItem, Box } from '@mui/material';
const Header = ({ showNotification, handleSubscribe }) => {
  // Use custom TonConnect hook for simplified wallet management
  const { } = useTonConnect();

  // Access the current language and function to change it
  const { language, changeLanguage } = useLanguage();

  // TON proof status is now managed by useTonConnect hook

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