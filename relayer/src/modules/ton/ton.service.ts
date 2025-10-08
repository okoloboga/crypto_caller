import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  TonClient,
  WalletContractV4,
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
  private relayerWallet: WalletContractV4;
  private readonly relayerAddress: Address;
  private readonly config: RelayerConfig;
  private keyPair: { publicKey: Buffer; secretKey: Buffer };
  private seqnoLock = false; // Prevent parallel seqno usage

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

    // Initialize relayer wallet
    this.initializeWallet().catch((error) => {
      this.logger.error("Failed to initialize wallet:", error);
    });

    this.relayerAddress = Address.parse(this.config.relayerWalletAddress);

    this.logger.log(
      `TON service initialized for relayer: ${this.relayerAddress.toString()}`,
    );
  }

  private async initializeWallet() {
    try {
      this.logger.log("[DEBUG] Initializing relayer wallet...");
      
      // Try to parse as mnemonic first
      const mnemonic = this.config.relayerPrivateKey.split(" ");
      if (mnemonic.length === 24) {
        // It's a mnemonic
        this.keyPair = await mnemonicToWalletKey(mnemonic);
        this.relayerWallet = WalletContractV4.create({
          workchain: 0,
          publicKey: this.keyPair.publicKey,
        });
        this.logger.log("[DEBUG] Wallet initialized from mnemonic");
      } else {
        // Assume it's a hex private key
        const privateKey = Buffer.from(this.config.relayerPrivateKey, "hex");
        this.keyPair = {
          publicKey: privateKey.slice(32),
          secretKey: privateKey,
        };
        this.relayerWallet = WalletContractV4.create({
          workchain: 0,
          publicKey: this.keyPair.publicKey,
        });
        this.logger.log("[DEBUG] Wallet initialized from private key");
      }

      // Verify wallet state in network
      await this.verifyWalletState();
      
    } catch (error) {
      this.logger.error("[DEBUG] Failed to initialize wallet:", error);
      throw new Error("Invalid relayer private key format");
    }
  }

  /**
   * Verify wallet state in network
   */
  private async verifyWalletState(): Promise<void> {
    try {
      this.logger.debug("[DEBUG] Verifying wallet state in network...");
      
      const walletContract = this.client.open(this.relayerWallet);
      const balance = await walletContract.getBalance();
      
      this.logger.log(`[DEBUG] Relayer wallet balance: ${balance} nanotons`);
      
      if (balance === 0n) {
        this.logger.warn("[DEBUG] Relayer wallet has zero balance - this may cause issues");
      }
      
      // Check if wallet is active
      const accountState = await this.client.getAccount(this.relayerAddress);
      this.logger.debug(`[DEBUG] Wallet account state: ${accountState.state.type}`);
      
      if (accountState.state.type === 'uninitialized') {
        this.logger.warn("[DEBUG] Wallet is uninitialized - needs activation");
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
        this.logger.debug(`Skipping transaction ${tx.transaction_id.lt}: invalid source or zero value`);
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
        subscriptionContract,
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
      const subscriptionContract = Address.parse(
        this.config.subscriptionContractAddress,
      );

      const messageBody = this.buildRefundUserBody(
        Address.parse(userAddress),
        amount,
      );

      // Send internal message
      await this.sendInternalMessage(
        subscriptionContract,
        BigInt(this.config.gasForCallback),
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
   * Send internal message from relayer wallet with seqno synchronization
   */
  async sendInternalMessage(
    to: string | Address,
    value: bigint,
    body?: Cell | any,
  ): Promise<string> {
    this.logger.debug(`[DEBUG] Starting internal message send to: ${to}, value: ${value}`);
    
    // Wait for seqno lock to be free
    while (this.seqnoLock) {
      this.logger.debug("[DEBUG] Waiting for seqno lock to be free...");
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.seqnoLock = true;
    
    try {
      // Get wallet contract state
      const walletContract = this.client.open(this.relayerWallet);

      // Parse address if string
      const toAddress = typeof to === "string" ? Address.parse(to) : to;
      this.logger.debug(`[DEBUG] Parsed destination address: ${toAddress.toString()}`);

      // Check wallet balance before sending
      const balance = await walletContract.getBalance();
      this.logger.debug(`[DEBUG] Current wallet balance: ${balance} nanotons`);
      
      if (balance < value + BigInt(this.config.gasForCallback)) {
        throw new Error(`Insufficient balance: ${balance} < ${value + BigInt(this.config.gasForCallback)}`);
      }

      // Get fresh seqno with retry
      let seqno: number;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          seqno = await walletContract.getSeqno();
          this.logger.debug(`[DEBUG] Got seqno: ${seqno} (attempt ${retryCount + 1})`);
          break;
        } catch (seqnoError) {
          retryCount++;
          this.logger.warn(`[DEBUG] Failed to get seqno (attempt ${retryCount}): ${seqnoError.message}`);
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to get seqno after ${maxRetries} attempts: ${seqnoError.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      // Create internal message
      const internalMessage = internal({
        to: toAddress,
        value: value,
        body: body,
        bounce: false,
      });

      this.logger.debug(`[DEBUG] Sending transaction with seqno: ${seqno} to ${toAddress.toString()}`);

      // Send message using wallet contract with retry on seqno error
      retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          await walletContract.sendTransfer({
            seqno: seqno,
            secretKey: this.keyPair.secretKey,
            messages: [internalMessage],
          });
          this.logger.debug(`[DEBUG] Transaction sent successfully on attempt ${retryCount + 1}`);
          break;
        } catch (sendError) {
          retryCount++;
          this.logger.warn(`[DEBUG] Send attempt ${retryCount} failed: ${sendError.message}`);
          
          // If it's a seqno error (exit code 33), get fresh seqno and retry
          if (sendError.message.includes('exitcode=33') || sendError.message.includes('exit code 33')) {
            this.logger.warn(`[DEBUG] Seqno error detected, getting fresh seqno...`);
            try {
              seqno = await walletContract.getSeqno();
              this.logger.debug(`[DEBUG] Updated seqno to: ${seqno}`);
            } catch (seqnoError) {
              this.logger.error(`[DEBUG] Failed to get fresh seqno: ${seqnoError.message}`);
            }
          }
          
          if (retryCount >= maxRetries) {
            this.logger.error(`[DEBUG] All send attempts failed after ${maxRetries} retries`);
            throw sendError;
          }
          
          this.logger.debug(`[DEBUG] Retrying in ${2000 * retryCount}ms...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }

      // Generate transaction hash (in production, get from blockchain)
      const txHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(
        `[DEBUG] Internal message sent successfully: ${toAddress.toString()}, value: ${value}, seqno: ${seqno}, hash: ${txHash}`,
      );
      return txHash;
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to send internal message: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      throw error;
    } finally {
      // Always release the lock
      this.seqnoLock = false;
      this.logger.debug("[DEBUG] Released seqno lock");
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<bigint> {
    try {
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
   * Get TON client instance
   */
  getClient(): TonClient {
    return this.client;
  }

  /**
   * Get jetton wallet contract
   */
  async getJettonWalletContract() {
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
}
