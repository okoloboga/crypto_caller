import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Paper } from '@mui/material';
const TaskList = ({ tasks, onEdit, onDelete, isDisabled, onDisabledAction }) => {
  // Translation hook for internationalization
  const { t } = useTranslation();

  return (
    <Box sx={{ 
      padding: 3,
      margin: 1,
      zIndex: 1,
    }}
    >
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <Paper
            key={task.id}
            sx={{
              backgroundColor: '#1a1a1a',
              padding: 2,
              marginBottom: 2,
              borderRadius: 8,
              boxShadow: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* Display task details */}
            <Typography variant="body1">
              {t('taskDetails', {
                currencyPair: task.currencyPair,
                targetPrice: task.targetPrice,
                sign: task.isPriceAbove ? '+' : '-',
              })}
            </Typography>

            {/* Edit and Delete buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={() => (isDisabled ? onDisabledAction() : onEdit(task))} // Trigger edit if not disabled
                disabled={isDisabled}
                variant="contained"
                color="secondary"
                fullWidth
              >
                {t('edit')}
              </Button>
              <Button
                onClick={() => (isDisabled ? onDisabledAction() : onDelete(task.id))} // Trigger delete if not disabled
                disabled={isDisabled}
                variant="contained"
                color="secondary"
                fullWidth
              >
                {t('delete')}
              </Button>
            </Box>
          </Paper>
        ))
      ) : (
        // Display message if no tasks are available
        <Typography variant="body1" color="text.secondary">
          {t('noTasks')}
        </Typography>
      )}
    </Box>
  );
};

// Export the TaskList component as the default export
export default TaskList;