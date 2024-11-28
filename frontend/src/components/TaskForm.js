import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { createTask, updateTask } from '../services/apiService';
import './TaskForm.css';

const TaskForm = ({ task, currencyPairs, onSave, onCancel, disabled, onDisabledAction }) => {
  const walletAddress = useTonAddress();
  const [form, setForm] = useState(task || { currencyPair: '', targetPrice: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log(`Task: ${JSON.stringify(task, null, 2)}`);
    if (task) {
      // Если есть task, то обновляем состояние формы с данными задачи
      setForm(task);
    } else {
      // Если нет task, инициализируем пустую форму
      setForm({ currencyPair: '', targetPrice: '' });
    }
  }, [task]);

  const isNewTask = !task?.id;

  // Save task handler
  const handleSave = async () => {
    if (disabled) {
      onDisabledAction();
      return;
    }

    if (!form.currencyPair || !form.targetPrice) {
      alert('Please fill in all fields.');
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
      alert('Failed to save the task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-form">
      <select
        placeholder="Currency Pair"
        value={form.currencyPair || ''}
        onChange={(e) => setForm({ ...form, currencyPair: e.target.value })}
        disabled={disabled || loading}
      >
        <option value="" disabled>Currency Pair</option> {/* Значение по умолчанию */}
        {currencyPairs.map((pair) => (
          <option key={pair} value={pair}>
            {pair}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Trigger Price"
        value={form.targetPrice}
        onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
        disabled={disabled || loading}
      />
      <div className="task-form-buttons">
        <button onClick={handleSave} disabled={disabled || loading}>
          Save
        </button>
        <button onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default TaskForm;
