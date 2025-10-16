import { Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
const Footer = ({ handleCreateTask }) => {
  // Translation hook for internationalization
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#1a1a1a',
        padding: "8px",
        height: "60px",
        textAlign: 'center',
        marginTop: 'auto', // Ensures the footer stays at the bottom
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
          {/* Container for the task creation button */}
          <Box sx={{ 
            padding: 0, 
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Button 
              onClick={handleCreateTask} // Trigger task creation
              variant="text"
              color="secondary" 
            >
              {t('createTask')} {/* Translated text for "Create Task" */}
            </Button>
          </Box>
        </Box>
      </nav>
    </Box>
  );
};

// Export the Footer component as the default export
export default Footer;