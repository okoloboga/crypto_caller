import { createApp, onMounted } from 'vue';
import App from './App.vue';
import router from './router'; // Импортируем маршрутизатор

const app = createApp(App);

app.use(router); // Подключаем маршрутизатор

app.mount('#app');

// Telegram Web App API инициализация
onMounted(() => {
  if (window.Telegram) {
    const tg = window.Telegram.WebApp;
    tg.expand(); // Открываем приложение на весь экран
  }
});
