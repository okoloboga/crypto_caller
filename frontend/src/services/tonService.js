import { TonConnectUI } from '@tonconnect/ui-react';

const tonService = {
  tonConnect: null,

  async connectWallet() {
    if (!this.tonConnect) {
      this.tonConnect = new TonConnectUI({
        manifestUrl: 'https://caller.ruble.website/manifest.json',
      });
    }

    try {
      await this.tonConnect.connectWallet();
      return this.tonConnect.wallet;
    } catch (error) {
      console.error('Ошибка подключения TON кошелька:', error);
      throw error;
    }
  },

  async initiatePayment(amount) {
    if (!this.tonConnect || !this.tonConnect.wallet) {
      throw new Error('TON Wallet не подключён.');
    }

    try {
      return this.tonConnect.sendTransaction({
        to: process.env.TON_WALLET,
        value: amount * 10 ** 9,
      });
    } catch (error) {
      console.error('Ошибка отправки транзакции:', error);
      throw error;
    }
  },
};

export default tonService;
