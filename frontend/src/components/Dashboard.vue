<template>
  <div class="dashboard">
    <h1>Welcome to Telegram Mini App!</h1>

    <!-- Подключение TON кошелька -->
    <div v-if="!isTonConnected">
      <button @click="connectTonWallet">Подключить TON кошелек</button>
    </div>

    <!-- Основной функционал приложения -->
    <div v-else>
      <h3>Ваши накопленные очки: {{ points }}</h3>
      <button v-if="!task" @click="openCreateTaskForm">Создать задание</button>
      <div v-if="task">
        <h3>Текущее задание: {{ task.currencyPair }} - {{ task.targetPrice }}</h3>
        <button @click="openEditTaskForm">Редактировать задание</button>
      </div>

      <!-- Форма создания или редактирования задания -->
      <div v-if="isCreatingTask || isEditingTask">
        <h3>{{ isEditingTask ? 'Редактировать задание' : 'Создать задание' }}</h3>
        <div>
          <h4>Выберите валютную пару:</h4>
          <div class="currency-pairs">
            <button
              v-for="pair in currencyPairs"
              :key="pair"
              :class="{ selected: newTask.currencyPair === pair }"
              @click="selectCurrencyPair(pair)"
            >
              {{ pair }}
            </button>
          </div>
        </div>
        <div>
          <label>Триггерная цена:</label>
          <input v-model.number="newTask.targetPrice" type="number" required />
        </div>
        <button @click="isEditingTask ? saveEditedTask() : saveTask()">Сохранить</button>
        <button @click="cancelTaskAction">Отмена</button>
      </div>
    </div>
  </div>
</template>

<script>
import DashboardScript from './DashboardScript.js';
import './DashboardStyles.css'; // Импортируем стили для компонента

export default {
  mixins: [DashboardScript],
  data() {
    return {
      currencyPairs: ['BTC/USDT', 'ETH/USDT', 'TON/USDT', 'SOL/USDT', 'BTC/ETH', 'BTC/TON'],
    };
  },
  methods: {
    selectCurrencyPair(pair) {
      this.newTask.currencyPair = pair;
    },
  },
};
</script>
