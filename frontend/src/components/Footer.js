import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getChallenge } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { Button, List, ListItem, Box, Typography, IconButton } from '@mui/material';
import AddAlarmIcon from '@mui/icons-material/AddAlarm';
import AddIcCallIcon from '@mui/icons-material/AddIcCall';

const Footer = ({ showNotification, handleCreateTask, handleSubscribe, setHasTonProof }) => {
	const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const wallet = useTonWallet();
  const { language, changeLanguage } = useLanguage();
  const [tonConnectUI, setOptions] = useTonConnectUI();

  useEffect(() => {
    const refreshPayload = async (challenge) => {
      // Запускаем запрос на получение tonProof
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

      // Получаем challenge или другие данные, если нужно
      const challenge = await getChallenge(walletAddress);

      try {
        await refreshPayload(challenge);

        // Проверяем наличие tonProof после вызова refreshPayload
        if (wallet.connectItems?.tonProof) {
          console.log('TON Proof:', wallet.connectItems.tonProof);
          setHasTonProof(true);  // Устанавливаем состояние в true, если tonProof найден
        } else {
          showNotification(t('retryConnection'));
          setHasTonProof(false); // Устанавливаем состояние в false, если tonProof отсутствует
          setTimeout(() => showNotification(''), 2000);
        }
      } catch (error) {
        console.error('Error checking tonProof:', error);
      }
    };

    checkTonProof();
  }, [walletAddress, wallet, tonConnectUI]); // Хуки на изменения адреса кошелька

  // Логика для переключения языка
  const handleLanguageChange = () => {
    const newLanguage = language === 'en' ? 'ru' : 'en';
    changeLanguage(newLanguage);
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#1a1a1a',
        padding: 0,
        height: "60px",
        textAlign: 'center',
        marginTop: 'auto',
      }}
    >
    <nav>
      <List
        sx={{
          display: 'flex',
          justifyContent: 'center', // Центрируем элементы
          padding: 0,
          margin: 0,
          gap: 3, // Отступы между элементами
        }}
      >
        <ListItem sx={{ 
          padding: 0, 
          flexGrow: 1,  // Растягиваем ListItem на всю доступную ширину
          display: 'flex',  // Применяем flexbox
          justifyContent: 'center',  // Центрируем содержимое по горизонтали
          alignItems: 'center'  // Центрируем содержимое по вертикали
        }}> 
          <IconButton 
            color="secondary" 
            onClick={handleSubscribe} 
            sx={{ width: '100%', height: '100%' }} // Растягиваем кнопку на всю ширину и высоту ListItem
          >
            <AddIcCallIcon />
          </IconButton>
        </ListItem>

        <ListItem sx={{ 
          padding: 0, 
          flexGrow: 1,  // Растягиваем ListItem на всю доступную ширину
          display: 'flex',  // Применяем flexbox
          justifyContent: 'center',  // Центрируем содержимое по горизонтали
          alignItems: 'center'  // Центрируем содержимое по вертикали
        }}>
          <IconButton 
            color="secondary" 
            onClick={handleCreateTask} 
            sx={{ width: '100%', height: '100%' }} // Растягиваем кнопку на всю ширину и высоту ListItem
          >
            <AddAlarmIcon />
          </IconButton>
        </ListItem>

        <ListItem sx={{ 
          padding: 0, 
          flexGrow: 1,  // Растягиваем ListItem на всю доступную ширину
          display: 'flex',  // Применяем flexbox
          justifyContent: 'center',  // Центрируем содержимое по горизонтали
          alignItems: 'center'  // Центрируем содержимое по вертикали
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

export default Footer;
