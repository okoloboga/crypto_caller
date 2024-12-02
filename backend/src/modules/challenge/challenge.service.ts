import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Address, Cell, contractAddress, loadStateInit, TonClient4 } from 'ton';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name); // Логгирование
  private challenges = new Map<string, { challenge: string; validUntil: number }>();
  private client: TonClient4;

  constructor() {
    this.client = new TonClient4({
      endpoint: 'https://mainnet-v4.tonhubapi.com', // API-эндпоинт TON
    });
  }

  generateChallenge(walletAddress: string): string {
    const challenge = randomBytes(32).toString('hex'); // Генерация случайного challenge
    const validUntil = Date.now() + 5 * 60 * 1000; // Валидность 5 минут
    
    const challengeData = { challenge, validUntil };
    
    // Проверка содержимого перед добавлением
    this.logger.log('Challenge data:', challengeData);
    
    this.challenges.set(walletAddress, challengeData);
  
    this.logger.log(`Generated challenge for walletAddress ${walletAddress}: ${challenge}`);
    return challenge;
  }

  async verifyTonProof(account, proof) {
    const payload = {
					address: account.address,
					public_key: account.publicKey,
					proof: {
						...proof,
						state_init: account.walletStateInit
					}
	  }

    this.logger.log(`Verifying TON Proof. Payload: ${JSON.stringify(payload, null, 2)}`);

    const stateInit = loadStateInit(Cell.fromBase64(payload.proof.state_init).beginParse())

	  this.logger.log('stateInit is OK ')

	  const client = new TonClient4({
		  endpoint: 'https://mainnet-v4.tonhubapi.com'
	  })

	  this.logger.log('client is OK:', client)

	  const masterAt = await client.getLastBlock()

	  this.logger.log('masterAt is OK:', masterAt)

	  const result = await client.runMethod(masterAt.last.seqno, Address.parse(payload.address), 'get_public_key', [])

	  this.logger.log('result is OK:', result, 'by walletAddress: ', payload.address)

	  const publicKey = Buffer.from(result.reader.readBigNumber().toString(16).padStart(64, '0'), 'hex')

      this.logger.log(`publicKey: ${publicKey}`)

	  if (!publicKey) {
		  return false
	  }
	  const wantedPublicKey = Buffer.from(payload.public_key, 'hex')
	  if (!publicKey.equals(wantedPublicKey)) {
		  return false
	  }
	  const wantedAddress = Address.parse(payload.address)
	  const address = contractAddress(wantedAddress.workChain, stateInit)
	  if (!address.equals(wantedAddress)) {
		  return false
	  }
	  const now = Math.floor(Date.now() / 1000)
	  if (now - (60 * 15) > payload.proof.timestamp) {
		  return false
	  }
    return true
  }
}
