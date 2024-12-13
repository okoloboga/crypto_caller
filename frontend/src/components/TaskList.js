import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Paper } from '@mui/material';

const TaskList = ({ tasks, onEdit, onDelete, isDisabled, onDisabledAction }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ 
      padding: 3,
      margin: 1,
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
            <Typography variant="body1">
              {t('taskDetails', {
                currencyPair: task.currencyPair,
                targetPrice: task.targetPrice,
                sign: task.isPriceAbove ? '+' : '-',
              })}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={() => (isDisabled ? onDisabledAction() : onEdit(task))}
                disabled={isDisabled}
                variant="contained"
                color="secondary"
                fullWidth
              >
                {t('edit')}
              </Button>
              <Button
                onClick={() => (isDisabled ? onDisabledAction() : onDelete(task.id))}
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
        <Typography variant="body1" color="text.secondary">
          {t('noTasks')}
        </Typography>
      )}
    </Box>
  );
};

export default TaskList;
