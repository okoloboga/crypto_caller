/**
 * Service for handling TON blockchain operations in the RUBLE Farming App backend.
 * This service provides functionality for sending Jetton tokens on the TON blockchain.
 * It initializes a central wallet using a mnemonic and interacts with the TON network
 * using the TonClient. It is part of the TonModule and is exported for use in other modules
 * (e.g., for handling withdrawals).
 */

import { Injectable, OnModuleInit } from '@nestjs/common'; // Import Injectable decorator for NestJS service
import {
  TonClient,
  WalletContractV4,
  beginCell,
  Address,
  toNano,
  internal,
} from '@ton/ton'; // Import TON blockchain utilities
import { mnemonicToPrivateKey } from '@ton/crypto'; // Import utility for deriving keys from mnemonic
import * as nacl from 'tweetnacl'; // Import nacl for cryptographic operations

/**
 * TonService class providing business logic for TON blockchain operations.
 * Initializes a central wallet and handles sending Jetton tokens to recipient addresses.
 */
@Injectable()
export class TonService implements OnModuleInit {
  // TON client for interacting with the TON blockchain
  private client: TonClient;

  // Central wallet for sending transactions
  private centralWallet: WalletContractV4 | null = null;

  // Address of the Jetton Master contract
  private jettonMasterAddress: Address;

  // Key pair for signing transactions
  private keyPair: nacl.SignKeyPair | null = null;

  // Flag to track initialization status
  private isInitialized = false;

  /**
   * Constructor to initialize the TON client and basic configuration.
   * Sets up the TonClient with the TON Center API endpoint.
   * @throws Error if JETTON_MASTER_ADDRESS is not defined in the environment.
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
  }

  /**
   * Initialize the service after module initialization.
   * This ensures proper async initialization of the central wallet.
   */
  async onModuleInit() {
    await this.initCentralWallet();
  }

  /**
   * Initialize the central wallet using a mnemonic from environment variables.
   * Derives the key pair and creates a WalletContractV4 instance.
   */
  private async initCentralWallet() {
    try {
      // Validate mnemonic exists
      if (!process.env.CENTRAL_WALLET_MNEMONIC) {
        throw new Error('CENTRAL_WALLET_MNEMONIC is not defined in .env');
      }

      // Split the mnemonic into an array of words
      const mnemonic = process.env.CENTRAL_WALLET_MNEMONIC.split(' ');
      
      // Validate mnemonic length
      if (mnemonic.length !== 24) {
        throw new Error('CENTRAL_WALLET_MNEMONIC must contain exactly 24 words');
      }

      // Derive the key pair from the mnemonic
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      
      // Generate a signing key pair using nacl
      this.keyPair = nacl.sign.keyPair.fromSecretKey(Buffer.from(keyPair.secretKey));

      // Create a WalletContractV4 instance for the central wallet
      this.centralWallet = WalletContractV4.create({
        workchain: 0, // Use the base workchain (0)
        publicKey: Buffer.from(this.keyPair.publicKey),
      });

      this.isInitialized = true;
      console.log('Central wallet initialized successfully');
    } catch (error) {
      console.error('Failed to initialize central wallet:', error);
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
   * Send Jetton tokens to a recipient address.
   * Constructs and sends a transaction from the central wallet to transfer Jetton tokens.
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
      const contract = this.client.open(wallet);

      // Check wallet account state before sending
      try {
        const accountState = await this.client.getContractState(wallet.address);
        console.log(`Wallet account state: ${accountState.state}`);
        
        // If account is not initialized, we need to initialize it first
        if (accountState.state === 'uninitialized') {
          throw new Error('Central wallet is not initialized in blockchain. Please initialize it first by sending a transaction.');
        }
      } catch (accountError) {
        console.warn(`Could not get account state: ${accountError.message}`);
        // Continue anyway - seqno check will fail if wallet is not active
      }

      // Get the current sequence number of the wallet
      const seqno = await contract.getSeqno();
      console.log(`Current wallet seqno: ${seqno}`);
      
      // If seqno is null, wallet might not be active
      if (seqno === null || seqno === undefined) {
        throw new Error('Cannot get seqno: wallet account is not active or not initialized');
      }

      // Get the Jetton wallet address for the central wallet
      const jettonWalletAddress = await this.getUserJettonWalletAddress(wallet.address, this.jettonMasterAddress);
      console.log(`Jetton wallet address: ${jettonWalletAddress.toString()}`);

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

      // Use sendTransfer method from opened contract (more reliable than external message)
      // This method handles the transaction signing and sending automatically
      console.log(`Sending transfer with seqno: ${seqno}`);
      console.log(`Recipient: ${recipientAddress}, Amount: ${amount}`);
      console.log(`Jetton wallet: ${jettonWalletAddress.toString()}`);
      
      await contract.sendTransfer({
        seqno,
        secretKey: Buffer.from(this.keyPair.secretKey),
        messages: [internalMessage],
        sendMode: 1, // Send mode for wallet v4
      });

      return { success: true, message: `Sent ${amount} tokens to ${recipientAddress}` };
    } catch (error) {
      // Log and throw an error if the transaction fails
      console.error('Error sending tokens:', error);
      throw new Error(`Failed to send tokens: ${error.message}`);
    }
  }
}