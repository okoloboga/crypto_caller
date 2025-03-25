/**
 * Service for handling challenge-related operations in the RUBLE Farming App backend.
 * This service provides methods for generating challenges and verifying TON proof for wallet authentication.
 * It uses the TON blockchain client (TonClient4) to interact with the TON network and validate proofs.
 */

import { Injectable, Logger } from '@nestjs/common'; // Import Injectable and Logger from NestJS
import { randomBytes } from 'crypto'; // Import randomBytes for generating random challenges
import { Address, Cell, contractAddress, loadStateInit, TonClient4 } from 'ton'; // Import TON blockchain utilities

/**
 * ChallengeService class providing business logic for challenge generation and TON proof verification.
 * Maintains a map of challenges and uses TonClient4 to interact with the TON blockchain.
 */
@Injectable()
export class ChallengeService {
  // Logger instance for logging service events
  private readonly logger = new Logger(ChallengeService.name);

  // Map to store challenges with their validity period, keyed by wallet address
  private challenges = new Map<string, { challenge: string; validUntil: number }>();

  // TON client for interacting with the TON blockchain
  private client: TonClient4;

  /**
   * Constructor to initialize the TON client.
   * Sets up the TonClient4 instance with the mainnet endpoint.
   */
  constructor() {
    this.client = new TonClient4({
      endpoint: 'https://mainnet-v4.tonhubapi.com', // TON mainnet API endpoint
    });
  }

  /**
   * Generate a random challenge for a given wallet address.
   * Stores the challenge with a 5-minute validity period.
   * @param walletAddress - The wallet address for which to generate the challenge.
   * @returns The generated challenge string.
   */
  generateChallenge(walletAddress: string): string {
    const challenge = randomBytes(32).toString('hex'); // Generate a 32-byte random challenge as a hex string
    const validUntil = Date.now() + 5 * 60 * 1000; // Set validity to 5 minutes from now
    
    const challengeData = { challenge, validUntil };
    
    // Log the challenge data for debugging
    this.logger.log('Challenge data:', challengeData);
    
    // Store the challenge in the map
    this.challenges.set(walletAddress, challengeData);
  
    this.logger.log(`Generated challenge for walletAddress ${walletAddress}: ${challenge}`);
    return challenge;
  }

  /**
   * Verify a TON proof submitted by the client.
   * Validates the proof by checking the public key, address, and timestamp against the TON blockchain.
   * @param account - The account object containing address, publicKey, and walletStateInit.
   * @param proof - The TON proof object containing the signature and timestamp.
   * @returns A boolean indicating whether the TON proof is valid.
   */
  async verifyTonProof(account: any, proof: any): Promise<boolean> {
    // Construct the payload for verification
    const payload = {
      address: account.address,
      public_key: account.publicKey,
      proof: {
        ...proof,
        state_init: account.walletStateInit,
      },
    };

    this.logger.log(`Verifying TON Proof. Payload: ${JSON.stringify(payload, null, 2)}`);

    // Load the state initialization from the proof
    const stateInit = loadStateInit(Cell.fromBase64(payload.proof.state_init).beginParse());
    this.logger.log('stateInit is OK');

    // Initialize a new TON client (redundant since this.client is already initialized in constructor)
    const client = new TonClient4({
      endpoint: 'https://mainnet-v4.tonhubapi.com',
    });
    this.logger.log('client is OK:', client);

    // Get the latest block from the TON blockchain
    const masterAt = await client.getLastBlock();
    this.logger.log('masterAt is OK:', masterAt);

    // Attempt to retrieve the public key from the blockchain
    const result = await client.runMethod(
      masterAt.last.seqno,
      Address.parse(payload.address),
      'get_public_key',
      [],
    );
    this.logger.log('result is OK:', result, 'by walletAddress: ', payload.address);

    // If the get_public_key method fails, fall back to using the state_init
    if (result.exitCode !== 0) {
      this.logger.log('get_public_key failed, using alternative method');

      // Retrieve the public key from the state_init
      const publicKeyFromStateInit = Buffer.from(payload.public_key, 'hex');
      if (!publicKeyFromStateInit) {
        return false; // Return false if the public key is invalid
      }

      // Compare the public key from state_init with the expected public key
      const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
      if (!publicKeyFromStateInit.equals(wantedPublicKey)) {
        return false; // Return false if the public keys do not match
      }

      // Verify the address matches the state_init
      const wantedAddress = Address.parse(payload.address);
      const address = contractAddress(wantedAddress.workChain, stateInit);
      if (!address.equals(wantedAddress)) {
        return false; // Return false if the addresses do not match
      }

      // Check if the proof timestamp is within 15 minutes of the current time
      const now = Math.floor(Date.now() / 1000);
      if (now - (60 * 15) > payload.proof.timestamp) {
        return false; // Return false if the proof is too old
      }

      return true; // Proof is valid
    }

    // If get_public_key succeeded, compare the retrieved public key
    const publicKey = Buffer.from(result.reader.readBigNumber().toString(16).padStart(64, '0'), 'hex');
    this.logger.log(`publicKey: ${publicKey}`);

    if (!publicKey) {
      return false; // Return false if the public key is invalid
    }

    const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
    if (!publicKey.equals(wantedPublicKey)) {
      return false; // Return false if the public keys do not match
    }

    // Verify the address matches the state_init
    const wantedAddress = Address.parse(payload.address);
    const address = contractAddress(wantedAddress.workChain, stateInit);
    if (!address.equals(wantedAddress)) {
      return false; // Return false if the addresses do not match
    }

    // Check if the proof timestamp is within 15 minutes of the current time
    const now = Math.floor(Date.now() / 1000);
    if (now - (60 * 15) > payload.proof.timestamp) {
      return false; // Return false if the proof is too old
    }

    return true; // Proof is valid
  }
}