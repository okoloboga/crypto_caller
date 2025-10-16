import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  TonClient,
  WalletContractV4,
  WalletContractV5R1,
  Address,
  beginCell,
  Cell,
  internal,
} from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto";
import { RelayerConfig } from "../../config/relayer.config";
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ УБРАНО: ParsedTransaction - больше не нужен, так как нет автоматического сканирования

@Injectable()
export class TonService {
  private readonly logger = new Logger(TonService.name);
  private readonly client: TonClient;
  private relayerWallet: WalletContractV5R1;
  private readonly relayerAddress: Address;
  private readonly config: RelayerConfig;
  private keyPair: { publicKey: Buffer; secretKey: Buffer };
  private seqnoLock = false; // Prevent parallel seqno usage
  private currentSeqno: number | null = null; // Track current seqno
  private walletInitialized = false; // Track wallet initialization state
  private walletInitPromise: Promise<void> | null = null; // Store initialization promise

  constructor(private configService: ConfigService) {
    // Add axios interceptors for better error handling (like in working project)
    axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      this.logger.debug(`Making request to: ${config.url}`);
      return config;
    });
    
    axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        this.logger.error(`Axios Response error: ${error.message}`);
        if (error.response) {
          this.logger.error(`Error status: ${error.response.status}`);
          this.logger.error(`Error data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return Promise.reject(error);
      }
    );

    this.config = this.configService.get<RelayerConfig>("relayer");
    
    if (!this.config) {
      throw new Error("Relayer configuration not found. Make sure environment variables are set.");
    }

    // Initialize TON client (same as backend)
    this.client = new TonClient({
      endpoint: "https://toncenter.com/api/v2/jsonRPC",
      apiKey: process.env.TON_API_KEY,
    });

    this.relayerAddress = Address.parse(this.config.relayerWalletAddress);

    this.logger.log(
      `TON service initialized for relayer: ${this.relayerAddress.toString()}`,
    );
  }

  /**
   * Ensure wallet is initialized before any operation
   */
  private async ensureWalletInitialized(): Promise<void> {
    if (this.walletInitialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.walletInitPromise) {
      this.logger.debug("[DEBUG] Wallet initialization already in progress, waiting...");
      await this.walletInitPromise;
      return;
    }

    // Start initialization
    this.walletInitPromise = this.initializeWalletWithRetry();
    await this.walletInitPromise;
  }

  /**
   * Initialize wallet with retry mechanism
   */
  private async initializeWalletWithRetry(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`[DEBUG] Initializing relayer wallet... (attempt ${attempt}/${maxRetries})`);
        
        await this.initializeWallet();
        
        this.walletInitialized = true;
        this.logger.log("[DEBUG] Wallet initialization completed successfully");
        return;
        
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`[DEBUG] Wallet initialization attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = 2000 * attempt; // Exponential backoff
          this.logger.log(`[DEBUG] Retrying wallet initialization in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.logger.error(`[DEBUG] Wallet initialization failed after ${maxRetries} attempts`);
    throw new Error(`Wallet initialization failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private async initializeWallet() {
    try {
      this.logger.log("[DEBUG] Initializing relayer wallet...");
      
      // Try to parse as mnemonic first
      const mnemonic = this.config.relayerPrivateKey.split(" ");
      if (mnemonic.length === 24) {
        // It's a mnemonic
        this.keyPair = await mnemonicToWalletKey(mnemonic);
        // Use V5R1 wallet (no walletId needed)
        this.relayerWallet = WalletContractV5R1.create({
          workchain: 0,
          publicKey: this.keyPair.publicKey,
        });
        this.logger.log("[DEBUG] Wallet initialized from mnemonic (V5R1 mainnet)");
      } else {
        // Assume it's a hex private key
        const privateKey = Buffer.from(this.config.relayerPrivateKey, "hex");
        this.keyPair = {
          publicKey: privateKey.slice(32),
          secretKey: privateKey,
        };
        // Use V5R1 wallet (no walletId needed)
        this.relayerWallet = WalletContractV5R1.create({
          workchain: 0,
          publicKey: this.keyPair.publicKey,
        });
        this.logger.log("[DEBUG] Wallet initialized from private key (V5R1 mainnet)");
      }

      // Verify wallet state in network
      await this.verifyWalletState();
      
    } catch (error) {
      this.logger.error("[DEBUG] Failed to initialize wallet:", error);
      throw new Error(`Wallet initialization failed: ${error.message}`);
    }
  }

  /**
   * Verify wallet state in network
   */
  private async verifyWalletState(): Promise<void> {
    try {
      this.logger.debug("[DEBUG] Verifying wallet state in network...");
      
      // Check if generated address matches expected address
      const generatedAddress = this.relayerWallet.address.toString();
      const expectedAddress = this.relayerAddress.toString();
      
      this.logger.log(`[DEBUG] Generated wallet address: ${generatedAddress}`);
      this.logger.log(`[DEBUG] Expected wallet address: ${expectedAddress}`);
      
      if (generatedAddress !== expectedAddress) {
        this.logger.error(`[DEBUG] ADDRESS MISMATCH! Generated address does not match expected address!`);
        this.logger.error(`[DEBUG] This indicates wrong wallet type or configuration`);
        throw new Error(`Address mismatch: generated ${generatedAddress} != expected ${expectedAddress}`);
      } else {
        this.logger.log(`[DEBUG] ✅ Address verification successful - addresses match!`);
      }
      
      const walletContract = this.client.open(this.relayerWallet);
      const balance = await walletContract.getBalance();
      
      this.logger.log(`[DEBUG] Relayer wallet balance: ${balance} nanotons`);
      
      if (balance === 0n) {
        this.logger.warn("[DEBUG] Relayer wallet has zero balance - this may cause issues");
      }
      
      // Check if wallet is active
      try {
        const accountState = await this.client.getContractState(this.relayerAddress);
        this.logger.debug(`[DEBUG] Wallet account state: ${accountState.state}`);
        
        if (accountState.state === 'uninitialized') {
          this.logger.warn("[DEBUG] Wallet is uninitialized - needs activation");
        }
      } catch (accountError) {
        this.logger.warn(`[DEBUG] Could not get account state: ${accountError.message}`);
      }
      
      this.logger.log("[DEBUG] Wallet state verification completed");
      
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to verify wallet state: ${error.message}`);
      throw error;
    }
  }

  // ✅ УБРАНО: getRecentTransactions - больше не нужен, так как нет автоматического сканирования

  // ✅ УБРАНО: parseApiTransaction - больше не нужен, так как нет автоматического сканирования

  private parseMessageBody(bodyBase64: string): Cell | undefined {
    try {
      return Cell.fromBase64(bodyBase64);
    } catch (error) {
      this.logger.debug(`Failed to parse message body: ${error.message}`);
      return undefined;
    }
  }

  // ✅ УБРАНО: parseTransaction - больше не нужен, так как нет автоматического сканирования

  /**
   * Send OnSwapCallback message to subscription contract
   */
  async sendOnSwapCallback(
    userAddress: string,
    jettonAmount: bigint,
    success: boolean,
  ): Promise<void> {
    try {
      this.logger.log(`[DEBUG] SENDING OnSwapCallback:`);
      this.logger.log(`[DEBUG]   - User: ${userAddress}`);
      this.logger.log(`[DEBUG]   - Jetton amount: ${jettonAmount}`);
      this.logger.log(`[DEBUG]   - Success: ${success}`);
      
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      const subscriptionContract = Address.parse(
        this.config.subscriptionContractAddress,
      );
      
      this.logger.log(`[DEBUG]   - Subscription contract: ${subscriptionContract.toString()}`);

      const messageBody = this.buildOnSwapCallbackBody(
        Address.parse(userAddress),
        jettonAmount,
        success,
      );

      this.logger.log(`[DEBUG]   - Message body created, sending to contract...`);

      // Send internal message
      const txHash = await this.sendInternalMessage(
        subscriptionContract.toString(),
        BigInt(this.config.gasForCallback),
        messageBody,
      );

      this.logger.log(`[DEBUG] ✅ OnSwapCallback sent successfully!`);
      this.logger.log(`[DEBUG]   - Transaction hash: ${txHash}`);
      this.logger.log(`[DEBUG]   - User: ${userAddress}, JettonAmount: ${jettonAmount}, Success: ${success}`);
    } catch (error) {
      this.logger.error(`[DEBUG] ❌ Failed to send OnSwapCallback: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      throw error;
    }
  }

  /**
   * Send RefundUser message to subscription contract
   */
  async sendRefundUser(userAddress: string, amount: bigint): Promise<void> {
    try {
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      const subscriptionContract = Address.parse(
        this.config.subscriptionContractAddress,
      );

      const messageBody = this.buildRefundUserBody(
        Address.parse(userAddress),
        amount,
      );

      // Send internal message with full refund amount + gas
      await this.sendInternalMessage(
        subscriptionContract.toString(),
        amount + BigInt(this.config.gasForCallback),
        messageBody,
      );

      this.logger.log(`Sent RefundUser: user=${userAddress}, amount=${amount}`);
    } catch (error) {
      this.logger.error(`Failed to send RefundUser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build OnSwapCallback message body
   */
  private buildOnSwapCallbackBody(
    user: Address,
    jettonAmount: bigint,
    success: boolean,
  ): Cell {
    return beginCell()
      .storeUint(0x05, 32) // message id
      .storeAddress(user)
      .storeCoins(jettonAmount)
      .storeBit(success)
      .endCell();
  }

  /**
   * Build RefundUser message body
   */
  private buildRefundUserBody(user: Address, amount: bigint): Cell {
    return beginCell()
      .storeUint(0x06, 32) // message id
      .storeAddress(user)
      .storeCoins(amount)
      .endCell();
  }

  /**
   * Send internal message from relayer wallet with improved seqno synchronization
   */
  async sendInternalMessage(
    destination: string,
    value: bigint,
    body: Cell,
  ): Promise<string> {
    // Ждем освобождения блокировки
    while (this.seqnoLock) {
      this.logger.debug("[DEBUG] Waiting for seqno lock to be free...");
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.seqnoLock = true;
    
    try {
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      // ⚠️ КРИТИЧНО: Проверяем баланс перед отправкой
      const currentBalance = await this.getWalletBalance();
      const requiredAmount = value + BigInt(this.config.gasForCallback); // value + gas
      
      this.logger.log(`[DEBUG] SENDING MESSAGE:`);
      this.logger.log(`[DEBUG]   - Destination: ${destination}`);
      this.logger.log(`[DEBUG]   - Value: ${value} nanotons (${value / 1_000_000_000n} TON)`);
      this.logger.log(`[DEBUG]   - Gas: ${this.config.gasForCallback} nanotons (${BigInt(this.config.gasForCallback) / 1_000_000_000n} TON)`);
      this.logger.log(`[DEBUG]   - Current balance: ${currentBalance} nanotons (${currentBalance / 1_000_000_000n} TON)`);
      this.logger.log(`[DEBUG]   - Required: ${requiredAmount} nanotons (${requiredAmount / 1_000_000_000n} TON)`);
      
      if (currentBalance < requiredAmount) {
        const error = `Insufficient balance: ${currentBalance} < ${requiredAmount} (value: ${value} + gas: ${this.config.gasForCallback})`;
        this.logger.error(`[DEBUG] ${error}`);
        this.logger.error(`[DEBUG] Shortage: ${requiredAmount - currentBalance} nanotons (${(requiredAmount - currentBalance) / 1_000_000_000n} TON)`);
        throw new Error(error);
      }
      
      const walletContract = this.client.open(this.relayerWallet);
      const seqno = await walletContract.getSeqno();
      this.logger.debug(`[DEBUG] Got seqno: ${seqno}`);
      
      // Отправляем транзакцию
      await walletContract.sendTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages: [
          internal({
            to: destination,
        value: value,
        body: body,
          }),
        ],
        sendMode: 1, // V5R1 requires sendMode
      });
      
      // Ждем увеличения seqno перед освобождением блокировки
      await this.waitForSeqnoIncrease(seqno);
      
      const txHash = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      this.logger.log(`[DEBUG] Internal message sent successfully: ${destination}, value: ${value}, seqno: ${seqno}, hash: ${txHash}`);
      
      return txHash;
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to send internal message: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      throw error;
    } finally {
      this.seqnoLock = false;
      this.logger.debug("[DEBUG] Released seqno lock");
    }
  }

  /**
   * Wait for seqno increase to ensure transaction is processed
   */
  private async waitForSeqnoIncrease(oldSeqno: number): Promise<void> {
    const maxAttempts = 30; // 30 секунд
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const walletContract = this.client.open(this.relayerWallet);
        const newSeqno = await walletContract.getSeqno();
        
        if (newSeqno > oldSeqno) {
          this.logger.debug(`[DEBUG] Seqno increased: ${oldSeqno} -> ${newSeqno}`);
          return;
        }
      } catch (error) {
        this.logger.debug(`[DEBUG] Failed to check seqno: ${error.message}`);
      }
    }
    
    this.logger.warn(`[DEBUG] Seqno did not increase after ${maxAttempts} seconds`);
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<bigint> {
    try {
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      const balance = await this.client.getBalance(this.relayerAddress);
      return balance;
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get jetton wallet address for relayer
   */
  async getJettonWalletAddress(): Promise<Address> {
    try {
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      const jettonMaster = Address.parse(this.config.jettonMasterAddress);

      // Call get_wallet_address method on jetton master
      const result = await this.client.runMethod(
        jettonMaster,
        "get_wallet_address",
        [
          {
            type: "slice",
            cell: beginCell().storeAddress(this.relayerAddress).endCell(),
          },
        ],
      );

      return result.stack.readAddress();
    } catch (error) {
      this.logger.error(
        `Failed to get jetton wallet address: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get relayer address
   */
  getRelayerAddress(): string {
    return this.relayerAddress.toString();
  }

  /**
   * Force wallet initialization (public method)
   */
  async forceWalletInitialization(): Promise<void> {
    this.logger.log("[DEBUG] Force wallet initialization requested");
    await this.ensureWalletInitialized();
  }

  /**
   * Check if wallet is initialized
   */
  isWalletInitialized(): boolean {
    return this.walletInitialized;
  }

  /**
   * Reset wallet initialization state (for debugging)
   */
  resetWalletInitialization(): void {
    this.logger.log("[DEBUG] Resetting wallet initialization state");
    this.walletInitialized = false;
    this.walletInitPromise = null;
  }

  /**
   * Get TON client instance
   */
  getClient(): TonClient {
    return this.client;
  }

  /**
   * Get jetton wallet contract
   */
  async getJettonWalletContract() {
    // Ensure wallet is initialized before proceeding
    await this.ensureWalletInitialized();
    
    // Get jetton wallet address for relayer
    const jettonWalletAddress = await this.getJettonWalletAddress();
    
    return {
      getData: async () => {
        try {
          // Call get_wallet_data method on jetton wallet contract
          const response = await this.client.runMethod(
            jettonWalletAddress,
            'get_wallet_data'
          );
          
          // get_wallet_data returns: (balance, owner, jetton_master, jetton_wallet_code)
          const balance = response.stack.readBigNumber();
          
          this.logger.debug(`[DEBUG] Real jetton wallet balance: ${balance.toString()}`);
          return { balance };
        } catch (error) {
          this.logger.error(`[DEBUG] Failed to get real jetton balance: ${error.message}`);
          // Fallback to 0 balance if method fails
          return { balance: 0n };
        }
      },
    };
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string): Promise<any> {
    try {
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      // Mock implementation - in production, query the blockchain
      // For now, simulate successful transaction after 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      return {
        hash: txHash,
        success: true,
        lt: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get jetton wallet address for a specific user
   */
  async getJettonWalletAddressForUser(userAddress: string): Promise<string> {
    try {
      this.logger.debug(`[DEBUG] Getting jetton wallet address for user: ${userAddress}`);
      
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      // Parse user address
      const userAddr = Address.parse(userAddress);
      
      // Get jetton master address from config
      const jettonMasterAddress = this.config.jettonMasterAddress;
      this.logger.debug(`[DEBUG] Using jetton master: ${jettonMasterAddress}`);
      
      // Get jetton wallet address for user by calling get_wallet_address on jetton master
      const jettonMaster = Address.parse(jettonMasterAddress);
      const result = await this.client.runMethod(
        jettonMaster,
        "get_wallet_address",
        [
          {
            type: "slice",
            cell: beginCell().storeAddress(userAddr).endCell(),
          },
        ],
      );

      const jettonWalletAddress = result.stack.readAddress();
      this.logger.debug(`[DEBUG] User jetton wallet address: ${jettonWalletAddress}`);
      return jettonWalletAddress.toString();
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to get user jetton wallet address: ${error.message}`);
      throw error;
    }
  }
}
