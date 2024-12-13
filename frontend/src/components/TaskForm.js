import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { createTask, updateTask } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import { Box, Button, MenuItem, Select, TextField, InputLabel, FormControl, FormHelperText } from '@mui/material';

const TaskForm = ({ task, currencyPairs, onSave, onCancel, disabled, onDisabledAction }) => {
  const { t } = useTranslation();
  const walletAddress = useTonAddress();
  const [form, setForm] = useState(task || { currencyPair: '', targetPrice: '', isPriceAbove: true }); // Добавляем isPriceAbove в стейт
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log(`Task: ${JSON.stringify(task, null, 2)}`);
    if (task) {
      setForm(task);
    } else {
      setForm({ currencyPair: '', targetPrice: '', isPriceAbove: true });
    }
  }, [task]);

  const isNewTask = !task?.id;

  const handleSave = async () => {
    if (disabled) {
      onDisabledAction();
      return;
    }

    if (!form.currencyPair || !form.targetPrice) {
      alert(t('fillFields'));
      return;
    }

    setLoading(true);
    try {
      console.log('Form:', JSON.stringify(form, null, 2));
      console.log('Task:', JSON.stringify(task, null, 2));
      if (!isNewTask) {
        const taskData = { ...form };
        await updateTask(task.id, taskData);
      } else {
        const taskData = { walletAddress, ...form };
        await createTask(taskData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving task:', error);
      alert(t('saveError'));
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
      }}
    >
      {/* Выбор валютной пары */}
      <FormControl fullWidth sx={{ marginBottom: 2 }} disabled={disabled || loading}>
        <Select
          value={form.currencyPair || ''}
          onChange={(e) => setForm({ ...form, currencyPair: e.target.value })}
          label={t('currencyPair')}
          sx={{
            borderRadius: '12px',
            backgroundColor: "#383838",
          }}
        >
          <MenuItem value="" disabled>{t('currencyPair')}</MenuItem>
          {currencyPairs.map((pair) => (
            <MenuItem key={pair} value={pair}>
              {pair}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Ввод целевой цены */}
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
      {/* Выбор направления цены относительно целевой */}
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

      {/* Кнопки сохранения и отмены */}
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

export default TaskForm;
