import React from 'react';
import './TaskList.css'

const TaskList = ({ tasks, onEdit, onDelete, isDisabled, onDisabledAction }) => {
  return (
    <div className="task-list">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div key={task.id} className="task-item">
            <p>{task.currencyPair}: {task.targetPrice}</p>
            <button
              onClick={() => (isDisabled ? onDisabledAction() : onEdit(task))}
              disabled={isDisabled}
            >
              Edit
            </button>
            <button
              onClick={() => (isDisabled ? onDisabledAction() : onDelete(task.id))}
              disabled={isDisabled}
            >
              Delete
            </button>
          </div>
        ))
      ) : (
        <p>No active tasks</p>
      )}
    </div>
  );
};

export default TaskList;
