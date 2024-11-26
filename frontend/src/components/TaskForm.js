import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { createTask, updateTask, deleteTask } from '../services/apiService';
import './TaskForm.css';

const TaskForm = ({ task, currencyPairs, onSave, onCancel, disabled, onDisabledAction }) => {
  const walletAddress = useTonAddress();
  const [form, setForm] = useState(task || { currencyPair: '', targetPrice: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log(`Task: ${task}`)
    if (task) {
      setForm(task); // Если задача существует, то устанавливаем ее в форму для редактирования
    } else {
      setForm({ currencyPair: '', targetPrice: '' }); // Если это новое задание, пустые поля
    }
  }, [task]);

  const isNewTask = !form.currencyPair && !form.targetPrice;

  // Обработчик сохранения задания
  const handleSave = async () => {
    if (disabled) {
      onDisabledAction();
      return;
    }

    if (!form.currencyPair || !form.targetPrice) {
      alert('Заполните все поля.');
      return;
    }

    setLoading(true);
    try {
      const taskData = { walletAddress, ...form };
      if (task) {
        await updateTask(task.id, taskData);
      } else {
        await createTask(taskData);
      }
      onSave();
    } catch (error) {
      console.error('Ошибка при сохранении задания:', error);
      alert('Не удалось сохранить задание. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик удаления задания
  const handleDelete = async () => {
    if (!task) return;
    setLoading(true);
    try {
      await deleteTask(task.id);
      onSave();
    } catch (error) {
      console.error('Ошибка при удалении задания:', error);
      alert('Не удалось удалить задание. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-form">
      <select
        value={form.currencyPair}
        onChange={(e) => setForm({ ...form, currencyPair: e.target.value })}
        disabled={disabled || loading}
      >
        <option value="">Выбери валюту</option>
        {currencyPairs.map((pair) => (
          <option key={pair} value={pair}>
            {pair}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Триггерная цена"
        value={form.targetPrice}
        onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
        disabled={disabled || loading}
      />
      <div className="task-form-buttons">
        <button onClick={handleSave} disabled={disabled || loading}>
          {isNewTask ? 'Сохранить изменения' : 'Сохранить'}
        </button>
        {isNewTask && (
          <button onClick={handleDelete} disabled={loading}>
            Удалить
          </button>
        )}
        <button onClick={onCancel} disabled={loading}>
          Отменить
        </button>
      </div>
    </div>
  );
};

export default TaskForm;
