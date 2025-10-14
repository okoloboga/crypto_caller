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

export interface ParsedTransaction {
  lt: string;
  hash: string;
  fromAddress: string;
  toAddress: string;
  valueNanotons: bigint;
  userAddress: string;
  body?: Cell;
}

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

  /**
   * Get recent transactions for the relayer wallet
   */
  async getRecentTransactions(
    limit: number = 25,
  ): Promise<ParsedTransaction[]> {
    try {
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      this.logger.debug(`Requesting transactions for address: ${this.relayerAddress.toString()}`);
      this.logger.debug(`Request params: limit=${limit}`);
      
      // Try direct axios call like in working project
      const apiKey = process.env.TON_API_KEY;
      const url = `https://toncenter.com/api/v2/getTransactions`;
      
      this.logger.debug(`Making direct API call to: ${url}`);
      
      const response = await axios.get(url, {
        params: {
          address: this.relayerAddress.toString(),
          limit: limit,
          archival: true
        },
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.ok) {
        throw new Error(`API returned error: ${JSON.stringify(response.data)}`);
      }

      const transactions = response.data.result || [];
      this.logger.debug(`Successfully received ${transactions.length} transactions via direct API`);
      
      const parsedTransactions: ParsedTransaction[] = [];

      for (const tx of transactions) {
        try {
          // Skip aborted/failed transactions
          if (tx.aborted === true) {
            this.logger.debug(`Skipping aborted transaction: ${tx.transaction_id?.hash || 'unknown'}`);
            continue;
          }

          // Parse transaction from API response format
          const parsed = this.parseApiTransaction(tx);
          if (parsed) {
            parsedTransactions.push(parsed);
          }
        } catch (error) {
          this.logger.warn(`Failed to parse transaction: ${error.message}`);
        }
      }

      return parsedTransactions;
    } catch (error) {
      this.logger.error("Failed to get recent transactions:", error);
      this.logger.error(`Request details: address=${this.relayerAddress.toString()}, limit=${limit}`);
      
      // Fallback to TonClient method
      this.logger.warn("Trying fallback with TonClient...");
      try {
        const transactions = await this.client.getTransactions(
          this.relayerAddress,
          {
            limit,
            hash: undefined,
            lt: undefined,
          },
        );

        const parsedTransactions: ParsedTransaction[] = [];
        for (const tx of transactions) {
          try {
            const parsed = await this.parseTransaction(tx);
            if (parsed) {
              parsedTransactions.push(parsed);
            }
          } catch (error) {
            this.logger.warn(`Failed to parse transaction: ${error.message}`);
          }
        }
        return parsedTransactions;
      } catch (fallbackError) {
        this.logger.error("Fallback also failed:", fallbackError);
        throw error;
      }
    }
  }

  /**
   * Parse a transaction from API response format
   */
  private parseApiTransaction(tx: any): ParsedTransaction | null {
    try {
      if (!tx.transaction_id || !tx.in_msg) {
        return null;
      }

      // Skip transactions without valid source address or zero value
      if (!tx.in_msg.source || !tx.in_msg.value || BigInt(tx.in_msg.value) === 0n) {
        return null;
      }

      return {
        lt: tx.transaction_id.lt,
        hash: tx.transaction_id.hash,
        fromAddress: tx.in_msg.source,
        toAddress: tx.in_msg.destination || '',
        valueNanotons: BigInt(tx.in_msg.value),
        userAddress: tx.in_msg.source,
        body: tx.in_msg.body ? this.parseMessageBody(tx.in_msg.body) : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse API transaction: ${error.message}`);
      return null;
    }
  }

  private parseMessageBody(bodyBase64: string): Cell | undefined {
    try {
      return Cell.fromBase64(bodyBase64);
    } catch (error) {
      this.logger.debug(`Failed to parse message body: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Parse a transaction and extract relevant information
   */
  private async parseTransaction(tx: any): Promise<ParsedTransaction | null> {
    try {
      // Check if this is an incoming transaction
      if (!tx.inMessage) {
        return null;
      }

      const inMsg = tx.inMessage;
      const fromAddress = inMsg.source?.toString();
      const toAddress = inMsg.destination?.toString();
      const valueNanotons = BigInt(inMsg.value || 0);

      // Only process transactions from subscription contract
      if (fromAddress !== this.config.subscriptionContractAddress) {
        return null;
      }

      // Only process transactions to relayer wallet
      if (toAddress !== this.relayerAddress.toString()) {
        return null;
      }

      // Parse user address from message body
      let userAddress: string;
      let body: Cell | undefined;

      if (inMsg.body) {
        try {
          body = Cell.fromBase64(inMsg.body);
          const slice = body.beginParse();

          // Check for our marker (0x73616d70)
          const op = slice.loadUint(32);
          if (op === 0x73616d70) {
            userAddress = slice.loadAddress().toString();
          } else {
            this.logger.warn(`Unknown message op: ${op}`);
            return null;
          }
        } catch (error) {
          this.logger.warn(`Failed to parse message body: ${error.message}`);
          return null;
        }
      } else {
        // Fallback to source address if no body
        userAddress = fromAddress;
      }

      return {
        lt: tx.lt.toString(),
        hash: tx.hash().toString("hex"),
        fromAddress,
        toAddress,
        valueNanotons,
        userAddress,
        body,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse transaction: ${error.message}`);
      return null;
    }
  }

  /**
   * Send OnSwapCallback message to subscription contract
   */
  async sendOnSwapCallback(
    userAddress: string,
    jettonAmount: bigint,
    success: boolean,
  ): Promise<void> {
    try {
      // Ensure wallet is initialized before proceeding
      await this.ensureWalletInitialized();
      
      const subscriptionContract = Address.parse(
        this.config.subscriptionContractAddress,
      );

      const messageBody = this.buildOnSwapCallbackBody(
        Address.parse(userAddress),
        jettonAmount,
        success,
      );

      // Send internal message
      await this.sendInternalMessage(
        subscriptionContract.toString(),
        BigInt(this.config.gasForCallback),
        messageBody,
      );

      this.logger.log(
        `Sent OnSwapCallback: user=${userAddress}, jettonAmount=${jettonAmount}, success=${success}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send OnSwapCallback: ${error.message}`);
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
    
    // This would return a jetton wallet contract instance
    // For now, we'll use a simplified approach
    // In production, you would import and use the actual jetton wallet contract
    return {
      getData: async () => {
        // Mock implementation - in production, call actual jetton wallet getData method
        return { balance: 1000000n };
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
