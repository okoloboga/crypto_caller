/**
 * TaskForm component for the RUBLE Farming App.
 * This component provides a form for creating or editing tasks to monitor currency pairs.
 * Users can select a currency pair, set a target price, and specify whether the price should be above or below the target.
 * The form supports both creating new tasks and updating existing ones, with validation and error handling.
 */

import React, { useEffect, useState } from 'react';

// Import hook to retrieve the TON wallet address
import { useTonAddress } from '@tonconnect/ui-react';

// Import API service functions for creating and updating tasks
import { createTask, updateTask } from '../services/apiService';

// Import translation hook for internationalization
import { useTranslation } from 'react-i18next';

// Import Material-UI components for layout and form controls
import { Box, Button, MenuItem, Select, TextField, FormControl } from '@mui/material';

/**
 * TaskForm component for creating or editing tasks.
 * @param {Object} props - The component props.
 * @param {Object} [props.task] - The task to edit (if provided, the form is in edit mode).
 * @param {string[]} props.currencyPairs - List of available currency pairs for selection.
 * @param {Function} props.onSave - Function to call after saving the task.
 * @param {Function} props.onCancel - Function to call when canceling the form.
 * @param {boolean} [props.disabled] - Whether the form is disabled.
 * @param {Function} [props.onDisabledAction] - Function to call if the form is disabled and an action is attempted.
 * @returns {JSX.Element} The rendered TaskForm component.
 */
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