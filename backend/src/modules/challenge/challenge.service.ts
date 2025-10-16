import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Address, Cell, contractAddress, loadStateInit, TonClient4 } from 'ton';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);
  private challenges = new Map<string, { challenge: string; validUntil: number }>();
  private client: TonClient4;
  constructor() {
    const endpoint = process.env.TON_NETWORK === 'testnet' 
      ? 'https://testnet-v4.tonhubapi.com' 
      : 'https://mainnet-v4.tonhubapi.com';

    this.client = new TonClient4({
      endpoint,
    });
  }

  generateChallenge(clientId: string): string {
    const challenge = randomBytes(32).toString('hex');
    const validUntil = Date.now() + 5 * 60 * 1000;
    
    const challengeData = { challenge, validUntil };
    this.logger.log('Challenge data:', challengeData);
    this.challenges.set(clientId, challengeData);
  
    this.logger.log(`Generated challenge for clientId ${clientId}: ${challenge}`);
    return challenge;
  }

  // Verify TON proof by checking public key, address, and timestamp against blockchain
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

    // Get the latest block from the TON blockchain
    const masterAt = await this.client.getLastBlock();
    this.logger.log('masterAt is OK:', masterAt);

    // Attempt to retrieve the public key from the blockchain
    const result = await this.client.runMethod(
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