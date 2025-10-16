import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { createTask, updateTask } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { Box, Button, MenuItem, Select, TextField, FormControl } from '@mui/material';
const TaskForm = ({ task, currencyPairs, onSave, onCancel, disabled, onDisabledAction }) => {
  // Translation hook for internationalization
  const { t } = useTranslation();

  // Retrieve the TON wallet address
  const walletAddress = useTonAddress();

  // State for the form data, initialized with the task or default values
  const [form, setForm] = useState(task || { currencyPair: 'BTC-USD', targetPrice: '0', isPriceAbove: true });

  // State to track loading status during save operations
  const [loading, setLoading] = useState(false);

  // Update the form state when the task prop changes
  useEffect(() => {
    console.log(`Task: ${JSON.stringify(task, null, 2)}`);
    if (task) {
      setForm(task); // Populate form with existing task data
    } else {
      setForm({ currencyPair: '', targetPrice: '', isPriceAbove: true }); // Reset form for new task
    }
  }, [task]);

  // Determine if this is a new task (no task ID) or an existing task being edited
  const isNewTask = !task?.id;

  /**
   * Handle saving the task (create or update).
   * Validates the form, sends the data to the server, and triggers the onSave callback.
   */
  const handleSave = async () => {
    if (disabled) {
      onDisabledAction();
      return;
    }

    // Validate required fields
    if (!form.currencyPair || !form.targetPrice) {
      alert(t('fillFields'));
      return;
    }

    setLoading(true);
    try {
      console.log('Form:', JSON.stringify(form, null, 2));
      console.log('Task:', JSON.stringify(task, null, 2));
      if (!isNewTask) {
        // Update existing task
        const taskData = { ...form };
        await updateTask(task.id, taskData);
      } else {
        // Create new task
        const taskData = { walletAddress, ...form };
        await createTask(taskData);
      }
      onSave(); // Notify parent component of successful save
    } catch (error) {
      console.error('Error saving task:', error);
      alert(t('saveError')); // Notify user of error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      backgroundColor: '#1a1a1a',
      padding: 3, 
      borderRadius: 8, 
      boxShadow: 3,
      margin: 1,
      zIndex: 1,
    }}
    >
      {/* Currency pair selection */}
      <FormControl fullWidth sx={{ marginBottom: 2 }} disabled={disabled || loading}>
        <Select
          value={form.currencyPair}
          onChange={(e) => setForm({ ...form, currencyPair: e.target.value })}
          sx={{
            borderRadius: '12px',
            backgroundColor: "#383838",
          }}
        >
          {currencyPairs.map((pair) => (
            <MenuItem key={pair} value={pair}>
              {pair}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Target price input */}
      <TextField
        fullWidth
        type="number"
        placeholder={t('triggerPrice')}
        value={form.targetPrice}
        onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
        disabled={disabled || loading}
        sx={{ 
          borderRadius: '12px',
          marginBottom: 2,
          backgroundColor: "#383838",
        }}
      />

      {/* Price direction selection (above or below target) */}
      <FormControl fullWidth sx={{ marginBottom: 2 }} disabled={disabled || loading}>
        <Select
          value={form.isPriceAbove ? 'above' : 'below'}
          onChange={(e) => setForm({ ...form, isPriceAbove: e.target.value === 'above' })}
          sx={{
            borderRadius: '12px',
            backgroundColor: "#383838",
          }}
        >
          <MenuItem value="above">{t('aboveTargetPrice')}</MenuItem>
          <MenuItem value="below">{t('belowTargetPrice')}</MenuItem>
        </Select>
      </FormControl>

      {/* Save and Cancel buttons */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1,
        marginTop: 2 
      }}
      >
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSave}
          disabled={disabled || loading}
          fullWidth
        >
          {t('save')}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={onCancel}
          disabled={loading}
          fullWidth
        >
          {t('cancel')}
        </Button>
      </Box>
    </Box>
  );
};

// Export the TaskForm component as the default export
export default TaskForm;