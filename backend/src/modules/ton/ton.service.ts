/**
 * Service for handling TON blockchain operations in the RUBLE Farming App backend.
 * This service provides functionality for sending Jetton tokens on the TON blockchain.
 * It initializes a central wallet using a private key (mnemonic or hex) and interacts with the TON network
 * using the TonClient. It is part of the TonModule and is exported for use in other modules
 * (e.g., for handling withdrawals).
 * Uses WalletContractV5R1 to match the Relayer implementation.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common'; // Import Injectable decorator for NestJS service
import {
  TonClient,
  WalletContractV5R1,
  beginCell,
  Address,
  toNano,
  internal,
} from '@ton/ton'; // Import TON blockchain utilities
import { mnemonicToWalletKey } from '@ton/crypto'; // Import utility for deriving keys from mnemonic

/**
 * TonService class providing business logic for TON blockchain operations.
 * Initializes a central wallet and handles sending Jetton tokens to recipient addresses.
 * Uses the same wallet initialization approach as Relayer for consistency.
 */
@Injectable()
export class TonService implements OnModuleInit {
  private readonly logger = new Logger(TonService.name);
  
  // TON client for interacting with the TON blockchain
  private client: TonClient;

  // Central wallet for sending transactions (V5R1 to match Relayer)
  private centralWallet: WalletContractV5R1 | null = null;

  // Address of the central wallet (for verification)
  private centralWalletAddress: Address | null = null;

  // Address of the Jetton Master contract
  private jettonMasterAddress: Address;

  // Key pair for signing transactions
  private keyPair: { publicKey: Buffer; secretKey: Buffer } | null = null;

  // Flag to track initialization status
  private isInitialized = false;
  
  // Lock for seqno to prevent parallel transactions
  private seqnoLock = false;

  /**
   * Constructor to initialize the TON client and basic configuration.
   * Sets up the TonClient with the TON Center API endpoint.
   * @throws Error if JETTON_MASTER_ADDRESS or RELAYER_PRIV_KEY is not defined in the environment.
   */
  constructor() {
    // Initialize the TON client with the TON Center API endpoint and API key
    this.client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TON_API_KEY, // API key should be set in .env
    });

    // Load and validate the Jetton Master address from environment variables
    const jettonAddress = process.env.JETTON_MASTER_ADDRESS;
    if (!jettonAddress) {
      throw new Error('JETTON_MASTER_ADDRESS is not defined in .env');
    }
    this.jettonMasterAddress = Address.parse(jettonAddress);
    
    // Validate that RELAYER_PRIV_KEY is set (we use the same wallet as Relayer)
    if (!process.env.RELAYER_PRIV_KEY) {
      throw new Error('RELAYER_PRIV_KEY is not defined in .env');
    }
    
    // Validate that RELAYER_WALLET_ADDR is set for address verification
    if (!process.env.RELAYER_WALLET_ADDR) {
      throw new Error('RELAYER_WALLET_ADDR is not defined in .env');
    }
    
    this.centralWalletAddress = Address.parse(process.env.RELAYER_WALLET_ADDR);
  }

  /**
   * Initialize the service after module initialization.
   * This ensures proper async initialization of the central wallet.
   */
  async onModuleInit() {
    await this.initCentralWallet();
  }

  /**
   * Initialize the central wallet using private key (mnemonic or hex) from environment variables.
   * Uses the same approach as Relayer for consistency.
   * Derives the key pair and creates a WalletContractV5R1 instance.
   */
  private async initCentralWallet() {
    try {
      this.logger.log('[DEBUG] Initializing central wallet...');
      
      const privateKeyValue = process.env.RELAYER_PRIV_KEY;
      if (!privateKeyValue) {
        throw new Error('RELAYER_PRIV_KEY is not defined in .env');
      }

      // Try to parse as mnemonic first (24 words)
      const mnemonic = privateKeyValue.split(' ');
      if (mnemonic.length === 24) {
        // It's a mnemonic
        this.keyPair = await mnemonicToWalletKey(mnemonic);
        // Use V5R1 wallet (no walletId needed)
        this.centralWallet = WalletContractV5R1.create({
          workchain: 0,
          publicKey: this.keyPair.publicKey,
        });
        this.logger.log('[DEBUG] Wallet initialized from mnemonic (V5R1 mainnet)');
      } else {
        // Assume it's a hex private key
        const privateKey = Buffer.from(privateKeyValue, 'hex');
        this.keyPair = {
          publicKey: privateKey.slice(32),
          secretKey: privateKey,
        };
        // Use V5R1 wallet (no walletId needed)
        this.centralWallet = WalletContractV5R1.create({
          workchain: 0,
          publicKey: this.keyPair.publicKey,
        });
        this.logger.log('[DEBUG] Wallet initialized from private key (V5R1 mainnet)');
      }

      // Verify wallet state in network
      await this.verifyWalletState();

      this.isInitialized = true;
      this.logger.log('Central wallet initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize central wallet:', error);
      throw error;
    }
  }

  /**
   * Verify wallet state in network
   * Checks that generated address matches expected address and validates wallet state
   */
  private async verifyWalletState(): Promise<void> {
    try {
      this.logger.debug('[DEBUG] Verifying wallet state in network...');
      
      if (!this.centralWallet || !this.centralWalletAddress) {
        throw new Error('Wallet not initialized before verification');
      }

      // Check if generated address matches expected address
      const generatedAddress = this.centralWallet.address.toString();
      const expectedAddress = this.centralWalletAddress.toString();
      
      this.logger.log(`[DEBUG] Generated wallet address: ${generatedAddress}`);
      this.logger.log(`[DEBUG] Expected wallet address: ${expectedAddress}`);
      
      if (generatedAddress !== expectedAddress) {
        this.logger.error(`[DEBUG] ADDRESS MISMATCH! Generated address does not match expected address!`);
        this.logger.error(`[DEBUG] This indicates wrong wallet type or configuration`);
        throw new Error(`Address mismatch: generated ${generatedAddress} != expected ${expectedAddress}`);
      } else {
        this.logger.log(`[DEBUG] ✅ Address verification successful - addresses match!`);
      }
      
      const walletContract = this.client.open(this.centralWallet);
      const balance = await walletContract.getBalance();
      
      this.logger.log(`[DEBUG] Central wallet balance: ${balance} nanotons`);
      
      if (balance === 0n) {
        this.logger.warn('[DEBUG] Central wallet has zero balance - this may cause issues');
      }
      
      // Check if wallet is active
      try {
        const accountState = await this.client.getContractState(this.centralWalletAddress);
        this.logger.debug(`[DEBUG] Wallet account state: ${accountState.state}`);
        
        if (accountState.state === 'uninitialized') {
          this.logger.warn('[DEBUG] Wallet is uninitialized - needs activation');
        }
      } catch (accountError) {
        this.logger.warn(`[DEBUG] Could not get account state: ${accountError.message}`);
      }
      
      this.logger.log('[DEBUG] Wallet state verification completed');
      
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to verify wallet state: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the Jetton wallet address for a user.
   * Queries the Jetton Master contract to find the user's Jetton wallet address.
   * @param userAddress - The user's TON address.
   * @param jettonMasterAddress - The address of the Jetton Master contract.
   * @returns The user's Jetton wallet address.
   */
  private async getUserJettonWalletAddress(userAddress: Address, jettonMasterAddress: Address): Promise<Address> {
    // Create a cell containing the user's address
    const userAddressCell = beginCell().storeAddress(userAddress).endCell();

    // Call the get_wallet_address method on the Jetton Master contract
    const response = await this.client.runMethod(jettonMasterAddress, 'get_wallet_address', [
      { type: 'slice', cell: userAddressCell },
    ]);

    // Extract and return the Jetton wallet address from the response
    return response.stack.readAddress();
  }

  /**
   * Get wallet balance
   */
  private async getWalletBalance(): Promise<bigint> {
    try {
      if (!this.centralWalletAddress) {
        throw new Error('Wallet address not initialized');
      }
      const balance = await this.client.getBalance(this.centralWalletAddress);
      return balance;
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send Jetton tokens to a recipient address.
   * Constructs and sends a transaction from the central wallet to transfer Jetton tokens.
   * Uses the same approach as Relayer for consistency.
   * @param recipientAddress - The TON address of the recipient.
   * @param amount - The amount of Jetton tokens to send (as a string).
   * @returns An object indicating the success of the transaction and a message.
   * @throws Error if the central wallet is not initialized or if the transaction fails.
   */
  async sendTokens(recipientAddress: string, amount: string) {
    // Ensure the service is fully initialized
    if (!this.isInitialized || !this.centralWallet || !this.keyPair) {
      throw new Error('Service is not fully initialized yet. Please wait and try again.');
    }

    // Prevent parallel transactions
    if (this.seqnoLock) {
      throw new Error('Transaction already in progress. Please wait for the current transaction to complete.');
    }

    this.seqnoLock = true;

    try {
      // Validate input parameters
      if (!recipientAddress || !amount) {
        throw new Error('Recipient address and amount are required');
      }

      // Validate amount is a positive number
      const amountNumber = parseFloat(amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const wallet = this.centralWallet;
      const walletContract = this.client.open(wallet);

      // Check wallet account state before sending
      try {
        const accountState = await this.client.getContractState(wallet.address);
        this.logger.debug(`[DEBUG] Wallet account state: ${accountState.state}`);
        
        // If account is not initialized, we need to initialize it first
        if (accountState.state === 'uninitialized') {
          throw new Error('Central wallet is not initialized in blockchain. Please initialize it first by sending a transaction.');
        }
      } catch (accountError) {
        this.logger.warn(`[DEBUG] Could not get account state: ${accountError.message}`);
        // Continue anyway - seqno check will fail if wallet is not active
      }

      // Check balance before sending
      const currentBalance = await this.getWalletBalance();
      const requiredGas = toNano('0.1'); // Gas for Jetton transfer
      const requiredAmount = requiredGas;
      
      this.logger.log(`[DEBUG] SENDING JETTON TOKENS:`);
      this.logger.log(`[DEBUG]   - Recipient: ${recipientAddress}`);
      this.logger.log(`[DEBUG]   - Amount: ${amount} tokens`);
      this.logger.log(`[DEBUG]   - Current balance: ${currentBalance} nanotons (${currentBalance / 1_000_000_000n} TON)`);
      this.logger.log(`[DEBUG]   - Required gas: ${requiredGas} nanotons (${requiredGas / 1_000_000_000n} TON)`);
      
      if (currentBalance < requiredAmount) {
        const error = `Insufficient balance: ${currentBalance} < ${requiredAmount} (gas: ${requiredGas})`;
        this.logger.error(`[DEBUG] ${error}`);
        throw new Error(error);
      }

      // Get the current sequence number of the wallet
      const seqno = await walletContract.getSeqno();
      this.logger.debug(`[DEBUG] Got seqno: ${seqno}`);
      
      // If seqno is null, wallet might not be active
      if (seqno === null || seqno === undefined) {
        throw new Error('Cannot get seqno: wallet account is not active or not initialized');
      }

      // Get the Jetton wallet address for the central wallet
      const jettonWalletAddress = await this.getUserJettonWalletAddress(wallet.address, this.jettonMasterAddress);
      this.logger.log(`[DEBUG] Jetton wallet address: ${jettonWalletAddress.toString()}`);

      // Construct the message body for the Jetton transfer
      const messageBody = beginCell()
        .storeUint(0x0f8a7ea5, 32) // Opcode for Jetton transfer
        .storeUint(0, 64) // Query ID (set to 0)
        .storeCoins(toNano(amount)) // Amount in nano units (depends on token decimals)
        .storeAddress(Address.parse(recipientAddress)) // Recipient address
        .storeAddress(wallet.address) // Response destination (for any remaining funds)
        .storeBit(0) // No custom payload
        .storeCoins(toNano('0.01')) // Forward TON amount for gas
        .storeBit(0) // No forward payload
        .endCell();

      // Create an internal message for the Jetton transfer
      const internalMessage = internal({
        to: jettonWalletAddress,
        value: toNano('0.1'), // TON amount for gas
        bounce: true, // Bounce back if the transaction fails
        body: messageBody,
      });

      // Use sendTransfer method from opened contract (same as Relayer)
      this.logger.log(`[DEBUG] Sending transfer with seqno: ${seqno}`);
      this.logger.log(`[DEBUG] Recipient: ${recipientAddress}, Amount: ${amount}`);
      this.logger.log(`[DEBUG] Jetton wallet: ${jettonWalletAddress.toString()}`);
      
      await walletContract.sendTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages: [internalMessage],
        sendMode: 1, // V5R1 requires sendMode
      });

      this.logger.log(`[DEBUG] Jetton transfer sent successfully: ${amount} tokens to ${recipientAddress}`);

      return { success: true, message: `Sent ${amount} tokens to ${recipientAddress}` };
    } catch (error) {
      // Log and throw an error if the transaction fails
      this.logger.error(`[DEBUG] Error sending tokens: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      throw new Error(`Failed to send tokens: ${error.message}`);
    } finally {
      this.seqnoLock = false;
      this.logger.debug('[DEBUG] Released seqno lock');
    }
  }
}