/**
 * Footer component for the RUBLE Farming App.
 * This component renders a footer navigation bar at the bottom of the app.
 * It includes a button to create a new task for monitoring currency pairs.
 * The footer is styled with Material-UI and supports internationalization for the button text.
 */

import { Button, Box } from '@mui/material';

// Import hooks for internationalization
import { useTranslation } from 'react-i18next';

/**
 * Footer component that renders a navigation bar with a task creation button.
 * @param {Object} props - The component props.
 * @param {Function} props.handleCreateTask - Function to handle the creation of a new task.
 * @returns {JSX.Element} The rendered Footer component.
 */
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