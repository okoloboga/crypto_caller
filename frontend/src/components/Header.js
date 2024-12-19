import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getChallenge } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { Button, List, ListItem, Box } from '@mui/material';

const Header = ({ showNotification, handleSubscribe, setHasTonProof }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const wallet = useTonWallet();
  const { language, changeLanguage } = useLanguage();
  const [tonConnectUI, setOptions] = useTonConnectUI();

  useEffect(() => {
    const refreshPayload = async (challenge) => {
      tonConnectUI.setConnectRequestParameters({ state: "loading" });

      if (challenge) {
        tonConnectUI.setConnectRequestParameters({
          state: "ready",
          value: { tonProof: challenge },
        });
      } else {
        tonConnectUI.setConnectRequestParameters(null);
      };
    };

    const checkTonProof = async () => {
      if (!walletAddress) return;

      const challenge = await getChallenge(walletAddress);

      try {
        await refreshPayload(challenge);

        if (wallet.connectItems?.tonProof) {
          console.log('TON Proof:', wallet.connectItems.tonProof);
          setHasTonProof(true);
        } else {
          showNotification(t('retryConnection'));
          setHasTonProof(false);
          setTimeout(() => showNotification(''), 2000);
        }
      } catch (error) {
        console.error('Error checking tonProof:', error);
      }
    };

    checkTonProof();
  }, [walletAddress, wallet, tonConnectUI]);

  const handleLanguageChange = () => {
    const newLanguage = language === 'en' ? 'ru' : 'en';
    changeLanguage(newLanguage);
  };

  return (
    <Box
      component="footer"
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
        <ListItem sx={{ 
          padding: 0, 
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}> 
          <Button 
            onClick={handleSubscribe} 
            variant="text"
            color="secondary"
          >
            ME
          </Button>
        </ListItem>

        <ListItem sx={{ 
          padding: 0, 
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <TonConnectButton />
        </ListItem>

        <ListItem sx={{ 
          padding: 0, 
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Button onClick={handleLanguageChange} variant="text" color="secondary">
            {language === 'en' ? 'EN' : 'RU'}
          </Button>
        </ListItem>
      </List>
    </nav>

    </Box>
  );
};

export default Header;
