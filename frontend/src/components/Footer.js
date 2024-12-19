import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { getChallenge } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { Button, Box } from '@mui/material';

const Footer = ({ showNotification, handleCreateTask, handleSubscribe, setHasTonProof }) => {
	const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const wallet = useTonWallet();
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

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#1a1a1a',
        padding: 0,
        height: "60px",
        textAlign: 'center',
        marginTop: 'auto',
        zIndex: 1,
      }}
    >
    <nav>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
          gap: 3,
        }}
      >
        <Box sx={{ 
          padding: 0, 
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Button  
            onClick={handleCreateTask}
            variant="text"
            color="secondary" 
          >
            {t('createTask')}
          </Button>
        </Box>
      </Box>
    </nav>

    </Box>
  );
};

export default Footer;
