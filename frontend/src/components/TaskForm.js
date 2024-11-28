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
      setForm(task);
    } else {
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
        value={form.currencyPair}
        placeholder="Currency Pair"
        onChange={(e) => setForm({ ...form, currencyPair: e.target.value })}
        disabled={disabled || loading}
      >
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
          {isNewTask ? 'Save' : 'Save Changes'}
        </button>
        <button onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default TaskForm;
