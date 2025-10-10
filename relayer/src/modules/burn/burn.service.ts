import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Address, toNano, beginCell, Cell } from "@ton/ton";
import { TonService } from "../ton/ton.service";
import { RelayerConfig } from "../../config/relayer.config";

export interface BurnResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

@Injectable()
export class BurnService {
  private readonly logger = new Logger(BurnService.name);
  private readonly config: RelayerConfig;

  constructor(
    private configService: ConfigService,
    private tonService: TonService,
  ) {
    this.config = this.configService.get<RelayerConfig>("relayer");
  }

  /**
   * Burn jetton tokens
   */
  async burnJetton(
    jettonAmount: bigint,
    userAddress: string,
    txId: string,
  ): Promise<BurnResult> {
    this.logger.log(
      `Starting burn: ${jettonAmount} jettons for user ${userAddress} (tx: ${txId})`,
    );

    try {
      // Get jetton wallet address for relayer
      const jettonWalletAddress =
        await this.tonService.getJettonWalletAddress();

      // Check if we have enough jettons to burn
      const balance = await this.getJettonBalance();
      if (balance < jettonAmount) {
        throw new Error(
          `Insufficient jetton balance: ${balance} < ${jettonAmount}`,
        );
      }

      // Send burn message to jetton wallet
      const burnTxHash = await this.sendBurnMessage(
        jettonWalletAddress.toString(),
        jettonAmount,
      );

      this.logger.log(
        `Burn completed: ${jettonAmount} jettons (tx: ${burnTxHash})`,
      );

      return {
        success: true,
        txHash: burnTxHash,
      };
    } catch (error) {
      this.logger.error(`Burn failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get jetton balance for an address
   */
  async getJettonBalance(): Promise<bigint> {
    try {
      // Get jetton wallet data
      const jettonWallet = await this.tonService.getJettonWalletContract();

      const walletData = await jettonWallet.getData();
      return walletData.balance;
    } catch (error) {
      this.logger.error(`Failed to get jetton balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send burn message to jetton wallet
   */
  private async sendBurnMessage(
    jettonWalletAddress: string,
    jettonAmount: bigint,
  ): Promise<string> {
    try {
      // Build burn message body
      const burnBody = this.buildBurnMessageBody(jettonAmount);

      this.logger.debug(`[DEBUG] Burn message body created: ${burnBody ? 'valid Cell' : 'invalid'}`);
      this.logger.debug(`[DEBUG] Sending burn to jetton wallet: ${jettonWalletAddress}`);
      this.logger.debug(`[DEBUG] Burn amount: ${jettonAmount}, gas: 0.1 TON`);

      // Send message to jetton wallet using TonService
      const txHash = await this.tonService.sendInternalMessage(
        jettonWalletAddress,
        toNano("0.1"), // Gas for burn operation
        burnBody,
      );

      this.logger.log(
        `Sent burn message to ${jettonWalletAddress}: ${jettonAmount} jettons (tx: ${txHash})`,
      );

      return txHash;
    } catch (error) {
      this.logger.error(`Failed to send burn message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build burn message body for jetton wallet
   * Opcode: 0x595f07bc (burn)
   */
  private buildBurnMessageBody(jettonAmount: bigint): Cell {
    // Jetton burn message structure:
    // - op: 0x595f07bc (burn)
    // - query_id: unique identifier
    // - amount: jettonAmount
    // - response_destination: relayer address (where to send excess gas)
    
    const burnBody = beginCell()
      .storeUint(0x595f07bc, 32) // Opcode for burn
      .storeUint(BigInt(Date.now()), 64) // Query ID
      .storeCoins(jettonAmount) // Amount to burn
      .storeAddress(Address.parse(this.config.relayerWalletAddress)) // Response destination
      .endCell();

    this.logger.debug(`[DEBUG] Built burn message body: ${burnBody.bits.length} bits`);
    
    return burnBody;
  }

  /**
   * Check if burn is possible (enough balance, etc.)
   */
  async canBurn(jettonAmount: bigint): Promise<boolean> {
    try {
      const jettonWalletAddress =
        await this.tonService.getJettonWalletAddress();
      const balance = await this.getJettonBalance();

      return balance >= jettonAmount;
    } catch (error) {
      this.logger.error(`Failed to check burn possibility: ${error.message}`);
      return false;
    }
  }

  /**
   * Get burn history for monitoring
   */
  async getBurnHistory(): Promise<any[]> {
    try {
      // TODO: Implement burn history tracking
      // This could be stored in database
      return [];
    } catch (error) {
      this.logger.error(`Failed to get burn history: ${error.message}`);
      return [];
    }
  }
}
