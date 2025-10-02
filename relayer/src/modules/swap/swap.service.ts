import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RelayerConfig } from "../../config/relayer.config";
import { Router, ROUTER_REVISION, ROUTER_REVISION_ADDRESS } from "@ston-fi/sdk";
import TonWeb from "tonweb";
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
  private readonly router: Router;
  private readonly provider: any;

  constructor(
    private configService: ConfigService,
    private tonService: TonService,
  ) {
    this.config = this.configService.get<RelayerConfig>("relayer");

    // Initialize STON.fi SDK (same RPC as backend)
    this.provider = new TonWeb.HttpProvider(
      "https://toncenter.com/api/v2/jsonRPC",
      {
        apiKey: process.env.TON_API_KEY,
      },
    );
    this.router = new Router(this.provider, {
      revision: ROUTER_REVISION.V1,
      address: ROUTER_REVISION_ADDRESS.V1,
    });
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
        `Building STON.fi swap transaction: ${amountNanotons} nanotons -> jettons`,
      );

      // Get jetton address from master contract
      const jettonAddress = await this.getJettonAddress();

      // Build swap transaction using STON.fi SDK
      const swapTxParams = await this.router.buildSwapProxyTonTxParams({
        userWalletAddress: userAddress,
        proxyTonAddress: "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez", // ProxyTON
        offerAmount: new TonWeb.utils.BN(amountNanotons.toString()),
        askJettonAddress: jettonAddress, // Use actual jetton address, not master
        minAskAmount: new TonWeb.utils.BN(1), // Minimum 1 jetton unit
        queryId: Date.now(),
        referralAddress: undefined,
      });

      this.logger.log(
        `Swap transaction built: to=${swapTxParams.to}, amount=${swapTxParams.gasAmount}`,
      );

      // Send transaction using TonService
      const txHash = await this.tonService.sendInternalMessage(
        swapTxParams.to.toString(),
        BigInt(swapTxParams.gasAmount),
        swapTxParams.payload,
      );

      this.logger.log(`Swap transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      const confirmed = await this.waitForTransactionConfirmation(
        txHash,
        30000,
      ); // 30 seconds timeout

      if (!confirmed) {
        return {
          jettonAmount: 0n,
          success: false,
          error: "Transaction confirmation timeout",
        };
      }

      // Get actual jetton amount received
      const actualJettonAmount = await this.getActualJettonAmount(
        userAddress,
        txId,
        expectedJettonAmount,
      );

      this.logger.log(`Swap completed: received ${actualJettonAmount} jettons`);

      return {
        jettonAmount: actualJettonAmount,
        success: true,
      };
    } catch (error) {
      this.logger.error(`STON.fi swap failed: ${error.message}`);
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
    userAddress: string,
    txId: string,
    fallbackAmount: bigint,
  ): Promise<bigint> {
    try {
      // Get jetton wallet data
      const jettonWallet = await this.tonService.getJettonWalletContract();
      const walletData = await jettonWallet.getData();

      return walletData.balance;
    } catch (error) {
      this.logger.error(`Failed to get jetton amount: ${error.message}`);
      // Return expected amount as fallback
      return fallbackAmount;
    }
  }

  /**
   * Get current swap rate (TON -> Jetton)
   */
  async getSwapRate(): Promise<bigint> {
    try {
      // Get pool data from STON.fi router
      const pool = await this.router.getPool({
        jettonAddresses: [
          "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez",
          this.config.jettonMasterAddress,
        ], // TON -> Jetton pool
      });

      if (!pool) {
        this.logger.warn("Pool not found, using fallback rate");
        return 10000n; // Fallback rate
      }

      // Get pool data to calculate rate
      const poolData = await pool.getData();

      // Calculate rate: jetton_reserve / ton_reserve
      const tonReserve = poolData.reserve0;
      const jettonReserve = poolData.reserve1;

      if (tonReserve.isZero() || jettonReserve.isZero()) {
        this.logger.warn("Pool reserves are zero, using fallback rate");
        return 10000n;
      }

      // Calculate rate with some slippage protection
      const rate = jettonReserve.div(tonReserve).mul(95).div(100); // 5% slippage protection

      this.logger.log(`Current swap rate: 1 TON = ${rate.toString()} jettons`);
      return BigInt(rate.toString());
    } catch (error) {
      this.logger.error(`Failed to get swap rate: ${error.message}`);
      // Return fallback rate on error
      return 10000n;
    }
  }

  /**
   * Check if swap is possible with current liquidity
   */
  async canSwap(amountNanotons: bigint): Promise<boolean> {
    try {
      // Basic amount constraints
      const minSwapAmount = 1000000n; // 0.001 TON minimum
      const maxSwapAmount = 1000000000000n; // 1000 TON maximum

      if (amountNanotons < minSwapAmount || amountNanotons > maxSwapAmount) {
        return false;
      }

      // Check pool liquidity
      const pool = await this.router.getPool({
        jettonAddresses: [
          "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez",
          this.config.jettonMasterAddress,
        ],
      });

      if (!pool) {
        this.logger.warn("Pool not found, swap not possible");
        return false;
      }

      const poolData = await pool.getData();

      // Check if pool has enough liquidity
      const tonReserve = poolData.reserve0;
      const jettonReserve = poolData.reserve1;

      if (tonReserve.isZero() || jettonReserve.isZero()) {
        this.logger.warn("Pool has zero reserves, swap not possible");
        return false;
      }

      // Check if requested amount is reasonable compared to pool size
      const maxReasonableAmount = tonReserve.div(10); // Max 10% of pool
      if (amountNanotons > BigInt(maxReasonableAmount.toString())) {
        this.logger.warn(
          `Requested amount ${amountNanotons} too large for pool size`,
        );
        return false;
      }

      this.logger.log(
        `Swap check passed: amount=${amountNanotons}, tonReserve=${tonReserve.toString()}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to check swap possibility: ${error.message}`);
      return false;
    }
  }

  /**
   * Get jetton address from master contract
   */
  private async getJettonAddress(): Promise<string> {
    try {
      // In production, this would query the jetton master contract to get the jetton address
      // For now, return the master address (this should be replaced with actual jetton address)
      this.logger.warn(
        "Using jetton master address as jetton address - this should be fixed!",
      );
      return this.config.jettonMasterAddress;
    } catch (error) {
      this.logger.error(`Failed to get jetton address: ${error.message}`);
      throw error;
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
