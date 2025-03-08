import { Injectable } from '@nestjs/common';
import {
  TonClient,
  WalletContractV4,
  JettonMaster,
  beginCell,
  Address,
  toNano,
  internal,
  external,
  storeMessage,
} from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import nacl from 'tweetnacl';

@Injectable()
export class TonService {
  private client: TonClient;
  private centralWallet: WalletContractV4 | null = null;
  private jettonMasterAddress: Address;
  private keyPair: nacl.SignKeyPair;

  constructor() {
    this.client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TON_API_KEY, // Добавь API ключ в .env
      
    });

    this.jettonMasterAddress = Address.parse(process.env.JETTON_CONTRACT); // Замени на адрес твоего Jetton-контракта

    this.initCentralWallet();
  }

  private async initCentralWallet() {
    const mnemonic = process.env.CENTRAL_WALLET_MNEMONIC.split(' ');
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    this.keyPair = nacl.sign.keyPair.fromSecretKey(Buffer.from(keyPair.secretKey));

    this.centralWallet = WalletContractV4.create({
      workchain: 0,
      publicKey: Buffer.from(this.keyPair.publicKey),
    });
  }

  private async getUserJettonWalletAddress(userAddress: Address, jettonMasterAddress: Address): Promise<Address> {
    const userAddressCell = beginCell().storeAddress(userAddress).endCell();

    const response = await this.client.runMethod(jettonMasterAddress, 'get_wallet_address', [
      { type: 'slice', cell: userAddressCell },
    ]);

    return response.stack.readAddress();
  }

  async sendTokens(recipientAddress: string, amount: string) {
    if (!this.centralWallet || !this.keyPair) {
      throw new Error('Central wallet is not initialized yet');
    }

    try {
      const wallet = this.centralWallet;
      const contract = this.client.open(wallet);

      const seqno = await contract.getSeqno();
      const jettonWalletAddress = await this.getUserJettonWalletAddress(wallet.address, this.jettonMasterAddress);

      // Формируем тело сообщения для перевода Jetton
      const messageBody = beginCell()
        .storeUint(0x0f8a7ea5, 32) // Опкод для Jetton-трансфера
        .storeUint(0, 64) // Query ID
        .storeCoins(toNano(amount)) // Сумма в нанотонах (зависит от decimals токена)
        .storeAddress(Address.parse(recipientAddress)) // Адрес получателя
        .storeAddress(wallet.address) // Response destination (возврат остатка)
        .storeBit(0) // Нет custom payload
        .storeCoins(toNano('0.01')) // Forward TON amount для газа
        .storeBit(0) // Нет forward payload
        .endCell();

      // Создаём внутреннее сообщение
      const internalMessage = internal({
        to: jettonWalletAddress,
        value: toNano('0.1'), // TON для оплаты газа
        bounce: true,
        body: messageBody,
      });

      // Формируем транзакцию
      const body = wallet.createTransfer({
        seqno,
        secretKey: Buffer.from(this.keyPair.secretKey),
        messages: [internalMessage],
      });

      // Создаём внешнее сообщение
      const externalMessage = external({
        to: wallet.address,
        body,
      });

      const externalMessageCell = beginCell().store(storeMessage(externalMessage)).endCell();
      const signedTransaction = externalMessageCell.toBoc();

      // Отправляем транзакцию
      await this.client.sendFile(signedTransaction);

      return { success: true, message: `Sent ${amount} tokens to ${recipientAddress}` };
    } catch (error) {
      console.error('Error sending tokens:', error);
      throw new Error('Failed to send tokens');
    }
  }
}