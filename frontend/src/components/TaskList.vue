<template>
    <div class="task-list">
      <h3>Ваши задания</h3>
      <ul>
        <li v-for="task in tasks" :key="task.id">
          {{ task.currencyPair }} - {{ task.targetPrice }}
          <button @click="$emit('edit', task)">Редактировать</button>
        </li>
      </ul>
      <button @click="$emit('create')">Создать задание</button>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      tasks: {
        type: Array,
        required: true,
      },
    },
  };
  </script>
  