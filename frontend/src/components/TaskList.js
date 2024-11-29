import React from 'react';
import { useTranslation } from 'react-i18next';
import './TaskList.css';

const TaskList = ({ tasks, onEdit, onDelete, isDisabled, onDisabledAction }) => {
  const { t } = useTranslation();

  return (
    <div className="task-list">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div key={task.id} className="task-item">
            <p>
              {t('taskDetails', {
                currencyPair: task.currencyPair,
                targetPrice: task.targetPrice,
                sign: task.isPriceAbove ? '+' : '-',
              })}
            </p>

            <button
              onClick={() => (isDisabled ? onDisabledAction() : onEdit(task))}
              disabled={isDisabled}
            >
              {t('edit')}
            </button>

            <button
              onClick={() => (isDisabled ? onDisabledAction() : onDelete(task.id))}
              disabled={isDisabled}
            >
              {t('delete')}
            </button>
          </div>
        ))
      ) : (
        <p>{t('noTasks')}</p>
      )}
    </div>
  );
};

export default TaskList;
