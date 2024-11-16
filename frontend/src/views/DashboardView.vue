<template>
    <div class="dashboard-view">
      <h1>Добро пожаловать в RUBLE Caller!</h1>
  
      <!-- Подключение TON кошелька -->
      <div v-if="!isTonConnected">
        <button @click="connectTonWallet">Подключить TON кошелек</button>
      </div>
  
      <!-- Интерфейс подписки -->
      <SubscriptionForm v-else />

      <!-- Основной функционал приложения -->
      <div v-if="isTonConnected && hasSubscription">
        <h3>Ваши накопленные очки: {{ points }}</h3>
        <button v-if="!task" @click="openCreateTaskForm">Создать задание</button>
        <div v-if="task">
          <h3>Текущее задание: {{ task.currencyPair }} - {{ task.targetPrice }}</h3>
          <button @click="openEditTaskForm">Редактировать задание</button>
        </div>

        <!-- Форма создания или редактирования задания -->
        <TaskForm
          v-if="isCreatingTask"
          :task="currentTask"
          :currencyPairs="currencyPairs"
          @save="saveTask"
          @cancel="cancelTaskAction"
        />
      </div>
    </div>
  </template>
  
  <script>
  import PointsDisplay from '@/components/PointsDisplay.vue';
  import TaskList from '@/components/TaskList.vue';
  import TaskForm from '@/components/TaskForm.vue';
  import { getUserTasks, createTask, updateTask } from '@/services/taskService';
  import { fetchUserPoints } from '@/services/apiService';
  import tonService from '@/services/tonService';
  
  export default {
    components: {
      SubscriptionForm,
      TaskForm,
    },
    data() {
      return {
        isTonConnected: false,
        hasSubscription: false,
        points: 0,
        tasks: [],
        isCreatingTask: false,
        currentTask: null,
        currencyPairs: ['BTC/USDT', 'ETH/USDT', 'TON/USDT', 'SOL/USDT', 'BTC/ETH', 'BTC/TON'],
      };
    },
    methods: {
      async connectTonWallet() {
        try {
          const wallet = await tonService.connectWallet();
          if (wallet) {
            this.isTonConnected = true;
            this.loadDashboardData();
          }
        } catch (error) {
          console.error('Ошибка подключения TON кошелька:', error);
        }
      },
      async loadDashboardData() {
        try {
          this.points = await fetchUserPoints();
          this.tasks = await getUserTasks();
        } catch (error) {
          console.error('Ошибка загрузки данных:', error);
        }
      },
      openCreateTaskForm() {
        this.isTaskFormVisible = true;
        this.currentTask = null;
      },
      openEditTaskForm(task) {
        this.isTaskFormVisible = true;
        this.currentTask = task;
      },
      closeTaskForm() {
        this.isTaskFormVisible = false;
        this.currentTask = null;
      },
      async saveTask(task) {
        await saveTask(task);
        this.isCreatingTask = false;
        this.loadDashboardData();
      },
    },
    mounted() {
      this.loadDashboardData();
    },
  };
  </script>
  