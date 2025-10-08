import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RelayerConfig } from "../../config/relayer.config";
import { DEX, pTON } from "@ston-fi/sdk";
import { TonClient, Address } from "@ton/ton";
import { TonService } from "../ton/ton.service";

export interface SwapResult {
  jettonAmount: bigint;
  success: boolean;
  error?: string;
}

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);
  private readonly config: RelayerConfig;
  private readonly router: any;
  private readonly client: TonClient;

  constructor(
    private configService: ConfigService,
    private tonService: TonService,
  ) {
    this.config = this.configService.get<RelayerConfig>("relayer");

    this.logger.log("Initializing STON.fi Router with updated API...");

    // Initialize TON client
    this.client = new TonClient({
      endpoint: "https://toncenter.com/api/v2/jsonRPC",
      apiKey: process.env.TON_API_KEY,
    });

    // Initialize Router using new DEX v2.1 API
    this.router = this.client.open(
      DEX.v2_1.Router.CPI.create(
        "kQALh-JBBIKK7gr0o4AVf9JZnEsFndqO0qTCyT-D-yBsWk0v" // CPI Router v2.1.0
      )
    );

    this.logger.log("STON.fi Router initialized successfully");
  }

  /**
   * Perform swap TON -> Jetton via STON.fi
   */
  async performSwap(
    amountNanotons: bigint,
    userAddress: string,
    txId: string,
  ): Promise<SwapResult> {
    this.logger.log(
      `Starting swap: ${amountNanotons} nanotons for user ${userAddress} (tx: ${txId})`,
    );

    try {
      // Check if we can perform the swap
      const canSwap = await this.canSwap(amountNanotons);
      if (!canSwap) {
        throw new Error("Insufficient liquidity for swap");
      }

      // Get current swap rate
      const rate = await this.getSwapRate();
      const expectedJettonAmount = (amountNanotons * rate) / 1_000_000_000n;

      // Build and execute real STON.fi swap transaction
      const result = await this.executeRealSwap(
        amountNanotons,
        expectedJettonAmount,
        userAddress,
        txId,
      );

      this.logger.log(
        `Swap completed: ${result.jettonAmount} jettons (success: ${result.success})`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Swap failed: ${error.message}`);
      return {
        jettonAmount: 0n,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute real STON.fi swap transaction
   */
  private async executeRealSwap(
    amountNanotons: bigint,
    expectedJettonAmount: bigint,
    userAddress: string,
    txId: string,
  ): Promise<SwapResult> {
    try {
      this.logger.log(
        `[DEBUG] Building STON.fi swap transaction: ${amountNanotons} nanotons -> jettons`,
      );

      // Get jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;
      this.logger.debug(`[DEBUG] Using jetton master address: ${jettonMasterAddress}`);

      // Build swap transaction using STON.fi SDK with correct parameters
      this.logger.debug(`[DEBUG] Building swap transaction: ${amountNanotons} nanotons -> jettons`);
      
      // Create pTON instance for swap
      const proxyTon = pTON.v2_1.create(
        "kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px" // pTON v2.1.0
      );

      // Get user's jetton wallet address for swap
      const userAddr = Address.parse(userAddress);
      const userJettonWalletAddress = await this.tonService.getJettonWalletAddressForUser(userAddress);
      this.logger.debug(`[DEBUG] User jetton wallet address: ${userJettonWalletAddress}`);

      // IMPORTANT: Relayer performs swap from its own wallet, not user's wallet
      const swapTxParams = await this.router.getSwapTonToJettonTxParams({
        userWalletAddress: this.config.relayerWalletAddress, // Relayer address, not user address
        proxyTon: proxyTon,
        offerAmount: amountNanotons,
        askJettonAddress: userJettonWalletAddress, // User's jetton wallet address
        minAskAmount: expectedJettonAmount.toString(),
        queryId: Date.now(),
        referralAddress: undefined,
      });
      
      this.logger.debug(`[DEBUG] Swap transaction parameters:`, {
        to: swapTxParams.to.toString(),
        gasAmount: swapTxParams.gasAmount,
        payloadSize: swapTxParams.payload ? swapTxParams.payload.bits.length : 0,
        userWallet: this.config.relayerWalletAddress,
        askJetton: jettonMasterAddress
      });

      this.logger.log(
        `[DEBUG] Swap transaction built: to=${swapTxParams.to}, amount=${swapTxParams.gasAmount}`,
      );

      // Send transaction using TonService
      const txHash = await this.tonService.sendInternalMessage(
        swapTxParams.to.toString(),
        BigInt(swapTxParams.gasAmount),
        swapTxParams.payload,
      );

      this.logger.log(`[DEBUG] Swap transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransactionConfirmation(
        txHash,
        30000,
      ); // 30 seconds timeout

      if (!confirmed) {
        this.logger.error(`[DEBUG] Transaction confirmation timeout for ${txHash}`);
        return {
          jettonAmount: 0n,
          success: false,
          error: "Transaction confirmation timeout",
        };
      }

      // Get actual jetton amount received
      const actualJettonAmount = await this.getActualJettonAmount(
        this.config.relayerWalletAddress, // Check relayer's jetton balance
        txId,
        expectedJettonAmount,
      );

      this.logger.log(`[DEBUG] Swap completed: received ${actualJettonAmount} jettons`);

      return {
        jettonAmount: actualJettonAmount,
        success: true,
      };
    } catch (error) {
      this.logger.error(`[DEBUG] STON.fi swap failed: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      return {
        jettonAmount: 0n,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransactionConfirmation(
    txHash: string,
    timeoutMs: number,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if transaction is confirmed
        const tx = await this.tonService.getTransaction(txHash);
        if (tx && tx.success) {
          return true;
        }
      } catch (error) {
        // Transaction not found yet, continue waiting
      }

      // Wait 2 seconds before next check
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return false;
  }

  /**
   * Get actual jetton amount received from swap
   */
  private async getActualJettonAmount(
    relayerAddress: string,
    txId: string,
    fallbackAmount: bigint,
  ): Promise<bigint> {
    try {
      this.logger.debug(`[DEBUG] Getting actual jetton amount for relayer: ${relayerAddress}`);
      
      // Get relayer's jetton wallet address
      const jettonWalletAddress = await this.tonService.getJettonWalletAddress();
      this.logger.debug(`[DEBUG] Relayer jetton wallet: ${jettonWalletAddress.toString()}`);

      // Get jetton wallet data
      const jettonWallet = await this.tonService.getJettonWalletContract();
      const walletData = await jettonWallet.getData();

      this.logger.debug(`[DEBUG] Jetton wallet balance: ${walletData.balance.toString()}`);
      return walletData.balance;
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to get jetton amount: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      // Return expected amount as fallback
      return fallbackAmount;
    }
  }

  /**
   * Get current swap rate (TON -> Jetton)
   */
  async getSwapRate(): Promise<bigint> {
    try {
      this.logger.debug(`[DEBUG] Getting swap rate for TON -> Jetton`);

      // Use jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;
      this.logger.debug(`[DEBUG] Using jetton master address: ${jettonMasterAddress}`);

      // Create pTON instance for pool lookup
      const proxyTon = pTON.v2_1.create(
        "kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px" // pTON v2.1.0
      );

      // Get pool using STON.fi router with correct parameters
      const pool = await this.router.getPool({
        jettonAddresses: [
          "kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px", // pTON address directly
          jettonMasterAddress, // Jetton master address
        ],
      });

      this.logger.debug(`[DEBUG] Pool lookup for rate calculation: ${pool ? 'found' : 'not found'}`);
      if (!pool) {
        this.logger.warn("[DEBUG] Pool not found, using fallback rate");
        return 10000n; // Fallback rate
      }
      this.logger.debug(`[DEBUG] Using pool ${pool.address} for rate calculation`);

      // Get pool data to calculate rate
      const poolData = await pool.getData();
      this.logger.debug(`[DEBUG] Pool reserves: reserve0=${poolData.reserve0.toString()}, reserve1=${poolData.reserve1.toString()}`);

      // Calculate rate: jetton_reserve / ton_reserve
      const tonReserve = poolData.reserve0;
      const jettonReserve = poolData.reserve1;

      if (tonReserve.isZero() || jettonReserve.isZero()) {
        this.logger.warn("[DEBUG] Pool reserves are zero, using fallback rate");
        return 10000n;
      }

      // Calculate rate with some slippage protection
      const rate = jettonReserve.div(tonReserve).mul(95).div(100); // 5% slippage protection

      this.logger.log(`[DEBUG] Current swap rate: 1 TON = ${rate.toString()} jettons`);
      return BigInt(rate.toString());
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to get swap rate: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      // Return fallback rate on error
      return 10000n;
    }
  }

  /**
   * Check if swap is possible with current liquidity
   */
  async canSwap(amountNanotons: bigint): Promise<boolean> {
    try {
      this.logger.debug(`[DEBUG] Starting swap possibility check for amount: ${amountNanotons} nanotons`);

      // Basic amount constraints
      const minSwapAmount = 1000000n; // 0.001 TON minimum
      const maxSwapAmount = 1000000000000n; // 1000 TON maximum

      if (amountNanotons < minSwapAmount || amountNanotons > maxSwapAmount) {
        this.logger.warn(`[DEBUG] Amount ${amountNanotons} is outside valid range (${minSwapAmount}-${maxSwapAmount})`);
        return false;
      }

      // Check relayer balance first
      const relayerBalance = await this.tonService.getWalletBalance();
      this.logger.debug(`[DEBUG] Relayer balance: ${relayerBalance} nanotons`);
      
      if (relayerBalance < amountNanotons + BigInt(this.config.gasForCallback)) {
        this.logger.warn(`[DEBUG] Insufficient relayer balance: ${relayerBalance} < ${amountNanotons + BigInt(this.config.gasForCallback)}`);
        return false;
      }

      // Get jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;
      this.logger.debug(`[DEBUG] Using jetton master address: ${jettonMasterAddress}`);

      // Check pool liquidity using STON.fi with correct parameters
      this.logger.debug(`[DEBUG] Checking pool for TON <-> Jetton Master (${jettonMasterAddress})`);
      
      // Create pTON instance for pool lookup
      const proxyTon = pTON.v2_1.create(
        "kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px" // pTON v2.1.0
      );

      this.logger.debug(`[DEBUG] pTON instance created: ${proxyTon.address?.toString() || 'no address'}`);

      try {
        const pool = await this.router.getPool({
          jettonAddresses: [
            "kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px", // pTON address directly
            jettonMasterAddress, // Jetton master address (not wallet)
          ],
        });

        this.logger.debug(`[DEBUG] Pool lookup result: ${pool ? 'found' : 'not found'}`);
        this.logger.debug(`[DEBUG] Pool details: address=${pool.address?.toString()}, reserves=${pool.reserves ? 'available' : 'not available'}`);
        
        if (!pool) {
          this.logger.warn("[DEBUG] No pool found for TON <-> Jetton Master pair");
          return false;
        }

        // Check if pool has required properties
        if (!pool.address) {
          this.logger.warn("[DEBUG] Pool found but missing address property");
          return false;
        }

        this.logger.debug(`[DEBUG] Pool address: ${pool.address.toString()}`);
        return true;
      } catch (error) {
        this.logger.error(`[DEBUG] Pool lookup failed: ${error.message}`);
        this.logger.error(`[DEBUG] Error details:`, error);
        return false;
      }
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to check swap possibility: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      return false;
    }
  }

  /**
   * Get jetton wallet address for relayer from master contract
   */
  private async getJettonWalletAddress(): Promise<string> {
    try {
      this.logger.debug(`[DEBUG] Getting jetton wallet address for relayer: ${this.tonService.getRelayerAddress()}`);
      this.logger.debug(`[DEBUG] Using jetton master: ${this.config.jettonMasterAddress}`);
      
      // Get jetton wallet address from master contract using TonService
      const jettonWalletAddress = await this.tonService.getJettonWalletAddress();
      
      this.logger.log(`[DEBUG] Jetton wallet address for relayer: ${jettonWalletAddress.toString()}`);
      return jettonWalletAddress.toString();
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to get jetton wallet address: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      
      // Fallback to master address if wallet address lookup fails
      this.logger.warn("[DEBUG] Falling back to jetton master address");
      return this.config.jettonMasterAddress;
    }
  }

  /**
   * Get swap history for monitoring
   */
  async getSwapHistory(): Promise<any[]> {
    try {
      // TODO: Implement swap history tracking
      // This could be stored in database or retrieved from STON.fi API
      return [];
    } catch (error) {
      this.logger.error(`Failed to get swap history: ${error.message}`);
      return [];
    }
  }
}
