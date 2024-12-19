import { useTonAddress, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Button, Box } from '@mui/material';

const Footer = ({ handleCreateTask }) => {
	const { t } = useTranslation();

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
