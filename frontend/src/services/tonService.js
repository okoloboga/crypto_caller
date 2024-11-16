import { TonConnect } from '@tonconnect/sdk';

const tonService = {
  tonConnect: null,
  async connectWallet() {
    if (!this.tonConnect) {
      this.tonConnect = new TonConnect();
    }
    await this.tonConnect.connectWallet();
    return this.tonConnect.wallet;
  },
};

export default tonService;
