import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { createTask, updateTask } from '../services/apiService';
import { useTranslation } from 'react-i18next';
import './TaskForm.css';

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
    <div className="task-form">
      <select
        placeholder={t('currencyPair')}
        value={form.currencyPair || ''}
        onChange={(e) => setForm({ ...form, currencyPair: e.target.value })}
        disabled={disabled || loading}
      >
        <option value="" disabled>{t('currencyPair')}</option>
        {currencyPairs.map((pair) => (
          <option key={pair} value={pair}>
            {pair}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder={t('triggerPrice')}
        value={form.targetPrice}
        onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
        disabled={disabled || loading}
      />

      <div className="price-trigger">
        <label>
          <select
            value={form.isPriceAbove ? 'above' : 'below'}
            onChange={(e) => setForm({ ...form, isPriceAbove: e.target.value === 'above' })}
            disabled={disabled || loading}
          >
            <option value="above">{t('aboveTargetPrice')}</option>
            <option value="below">{t('belowTargetPrice')}</option>
          </select>
        </label>
      </div>

      <div className="task-form-buttons">
        <button onClick={handleSave} disabled={disabled || loading}>
          {t('save')}
        </button>
        <button onClick={onCancel} disabled={loading}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
};

export default TaskForm;
