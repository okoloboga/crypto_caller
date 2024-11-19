import { TonConnectUI } from '@tonconnect/ui-react';

const tonService = {
  tonConnect: null,

  async connectWallet() {
    // Инициализируем TonConnectUI с манифестом, если он ещё не создан
    if (!this.tonConnect) {
      this.tonConnect = new TonConnectUI({
        manifestUrl: 'https://caller.ruble.website/manifest.json', // Укажите путь к вашему манифесту
      });
    }

    try {
      // Открываем окно подключения кошелька
      await this.tonConnect.connectWallet();
      return this.tonConnect.wallet; // Возвращаем данные подключённого кошелька
    } catch (error) {
      if (error.message && error.message.includes('Wallet was not connected')) {
        // Пользователь закрыл окно подключения
        console.warn('Пользователь отменил подключение кошелька.');
        return null; // Возвращаем null, чтобы обработать этот случай в UI
      }

      // Для остальных ошибок
      console.error('Ошибка подключения TON кошелька:', error);
      throw error;
    }
  },

  async initiatePayment(amount) {
    if (!this.tonConnect || !this.tonConnect.wallet) {
      throw new Error('TON Wallet не подключён.');
    }

    try {
      // Отправляем транзакцию
      return this.tonConnect.sendTransaction({
        to: process.env.TON_WALLET, // Замените на адрес вашего смарт-контракта
        value: amount * 10 ** 9, // Сумма в нанограммах
      });
    } catch (error) {
      console.error('Ошибка отправки транзакции:', error);
      throw error;
    }
  },
};

export default tonService;
