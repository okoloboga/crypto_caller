import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RelayerConfig } from "../../config/relayer.config";
import { DEX, pTON } from "@ston-fi/sdk";
import { TonClient, Address } from "@ton/ton";
import { TonService } from "../ton/ton.service";
import { StonApiClient } from "@ston-fi/api";
import { dexFactory } from "@ston-fi/sdk";

export interface SwapResult {
  jettonAmount: bigint;
  success: boolean;
  error?: string;
}

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);
  private readonly config: RelayerConfig;
  private router: any;
  private readonly client: TonClient;
  private contracts: any;
  private routerInfo: any;

  constructor(
    private configService: ConfigService,
    private tonService: TonService,
  ) {
    this.config = this.configService.get<RelayerConfig>("relayer");

    this.logger.log("Initializing STON.fi Router v2.2 CPI with SDK API...");

    // Initialize TON client
    this.client = new TonClient({
      endpoint: "https://toncenter.com/api/v2/jsonRPC",
      apiKey: process.env.TON_API_KEY,
    });

    // Initialize router asynchronously
    this.initRouter();
  }

  /**
   * Initialize Router using dexFactory approach
   */
  private async initRouter(): Promise<void> {
    try {
      this.logger.log("Initializing Router with dexFactory approach...");
      
      const stonApi = new StonApiClient();
      
      let routers;
      try {
        // Get all available routers
        routers = await stonApi.getRouters();
      } catch (apiError) {
        this.logger.warn(`[DEBUG] Failed to get routers from API: ${apiError.message}`);
        this.logger.warn(`[DEBUG] Using fallback router address`);
        
        // Fallback to known working router address
        const fallbackRouterAddress = "EQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250cN3";
        this.routerInfo = await stonApi.getRouter(fallbackRouterAddress);
        this.contracts = dexFactory(this.routerInfo);
        this.router = this.client.open(this.contracts.Router.create(Address.parse(this.routerInfo.address)));
        this.logger.log("STON.fi Router v2.2 initialized successfully with fallback address");
        return;
      }
      this.logger.debug(`[DEBUG] Found ${routers.length} routers`);
      
      // Log all available routers for debugging
      routers.forEach((r, index) => {
        this.logger.debug(`[DEBUG] Router ${index}: ${r.address} (v${r.majorVersion}.${r.minorVersion}, ${r.routerType}, ${r.network})`);
      });
      
      // Find latest Router v2.2 ConstantProduct (mainnet is default)
      const targetRouter = routers
        .filter(r => r.majorVersion === 2 && r.minorVersion === 2 && r.routerType === "ConstantProduct")
        .at(-1); // Get the last (most recent) router
      
      if (!targetRouter) {
        this.logger.error(`[DEBUG] No Router v2.2 ConstantProduct found. Available routers:`);
        routers.forEach(r => {
          this.logger.error(`[DEBUG] - ${r.address} (v${r.majorVersion}.${r.minorVersion}, ${r.routerType}, ${r.network})`);
        });
        throw new Error("No Router v2.2 ConstantProduct found");
      }
      
      const routerAddress = targetRouter.address;
      this.logger.log(`[DEBUG] Selected router: ${routerAddress} (v${targetRouter.majorVersion}.${targetRouter.minorVersion})`);
      
      // Get router metadata
      this.routerInfo = await stonApi.getRouter(routerAddress);
      this.logger.debug(`[DEBUG] Router info:`, {
        address: this.routerInfo.address,
        majorVersion: this.routerInfo.majorVersion,
        minorVersion: this.routerInfo.minorVersion,
        routerType: this.routerInfo.routerType,
        ptonMasterAddress: this.routerInfo.ptonMasterAddress,
      });
      
      // Get contracts from dexFactory
      this.contracts = dexFactory(this.routerInfo);
      this.logger.debug(`[DEBUG] Contracts:`, Object.keys(this.contracts));
      
      // Create router instance
      this.router = this.client.open(this.contracts.Router.create(Address.parse(this.routerInfo.address)));
      
      this.logger.log("STON.fi Router v2.2 initialized successfully with dexFactory");
    } catch (error) {
      this.logger.error(`Failed to initialize Router: ${error.message}`);
      throw error;
    }
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
      // Ensure router is initialized
      if (!this.router || !this.contracts || !this.routerInfo) {
        this.logger.warn("Router not initialized yet, waiting...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this.router || !this.contracts || !this.routerInfo) {
          throw new Error("Router initialization failed");
        }
      }
      
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();
      
      // Check if we can perform the swap
      const canSwap = await this.canSwap(amountNanotons);
      if (!canSwap) {
        throw new Error("Insufficient liquidity for swap");
      }

      // Get current swap rate
      const rate = await this.getSwapRate();
      const expectedJettonAmount = (amountNanotons * rate) / 1_000_000_000n;

      // Validate expected amount
      if (expectedJettonAmount === 0n) {
        throw new Error(`Invalid swap calculation: expectedJettonAmount is 0 (rate: ${rate}, amount: ${amountNanotons})`);
      }

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
      
      // Create pTON using dexFactory (correct approach)
      const proxyTon = this.contracts.pTON.create(this.routerInfo.ptonMasterAddress);

      // IMPORTANT: Relayer performs swap from its own wallet, not user's wallet
      // Router v2.2 automatically sends jettons to the wallet that performs the swap (relayer)
      const swapTxParams = await this.router.getSwapTonToJettonTxParams({
        userWalletAddress: Address.parse(this.config.relayerWalletAddress), // Relayer address, not user address
        proxyTon: proxyTon,
        offerAmount: amountNanotons,
        askJettonAddress: Address.parse(jettonMasterAddress), // Jetton master address
        minAskAmount: expectedJettonAmount, // Router v2.2 expects BigInt
        queryId: BigInt(Date.now()),
        referralAddress: undefined,
        gasAmount: 300_000_000n, // 0.3 TON на газ для Router v2.2
        forwardGasAmount: 50_000_000n, // 0.05 TON forward gas
      });
      
      // Debug: Log full swapTxParams object to diagnose issues
      const actualBody = swapTxParams.body || swapTxParams.payload;
      this.logger.debug(`[DEBUG] swapTxParams full object:`, {
        to: swapTxParams.to?.toString(),
        value: swapTxParams.value,
        gasAmount: swapTxParams.gasAmount,
        hasBody: 'body' in swapTxParams,
        hasPayload: 'payload' in swapTxParams,
        bodySize: swapTxParams.body ? swapTxParams.body.bits.length : 0,
        payloadSize: swapTxParams.payload ? swapTxParams.payload.bits.length : 0,
        actualBodySize: actualBody ? actualBody.bits.length : 0,
        bodyHex: actualBody ? actualBody.toBoc().toString('hex') : 'none',
        allKeys: Object.keys(swapTxParams),
      });
      
      this.logger.log(`[DEBUG] ✅ Swap transaction parameters built successfully:`);
      this.logger.log(`[DEBUG]   - Destination: ${swapTxParams.to.toString()}`);
      this.logger.log(`[DEBUG]   - Value (gas): ${swapTxParams.value || swapTxParams.gasAmount || 'undefined'}`);
      this.logger.log(`[DEBUG]   - Body size: ${actualBody ? actualBody.bits.length : 0} bits`);
      this.logger.log(`[DEBUG]   - Swap from: ${this.config.relayerWalletAddress} (relayer)`);
      this.logger.log(`[DEBUG]   - Asking for: ${jettonMasterAddress} (jetton master)`);
      this.logger.log(`[DEBUG]   - Jettons will be delivered to: ${this.config.relayerWalletAddress} (relayer wallet)`);
      this.logger.log(`[DEBUG]   - Amount in: ${amountNanotons} nanotons`);
      this.logger.log(`[DEBUG]   - Expected out: ${expectedJettonAmount} jettons`);

      this.logger.log(
        `[DEBUG] Swap transaction built: to=${swapTxParams.to}, amount=${swapTxParams.value || swapTxParams.gasAmount}`,
      );

      // Send transaction using TonService
      // Router v2.2 returns 'body' instead of 'payload'
      const messageBody = swapTxParams.body || swapTxParams.payload;
      
      if (!messageBody) {
        throw new Error('No message body in swapTxParams - cannot send swap transaction');
      }
      
      // Get jetton balance BEFORE swap
      const balanceBefore = await this.getActualJettonAmount(

        
        this.config.relayerWalletAddress,
        txId,
        0n,
      );
      this.logger.debug(`[DEBUG] Jetton balance BEFORE swap: ${balanceBefore}`);
      
      this.logger.debug(`[DEBUG] Sending swap with body size: ${messageBody.bits.length} bits`);
      
      // Use address from SDK (correct approach)
      const destination = swapTxParams.to.toString();
      const value = BigInt(swapTxParams.value ?? swapTxParams.gasAmount);
      
      this.logger.debug(`[DEBUG] Sending to address from SDK: ${destination}`);
      this.logger.debug(`[DEBUG] Value: ${value}`);
      
      const txHash = await this.tonService.sendInternalMessage(
        destination, // Address from SDK
        value,
        messageBody,
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

      // Get jetton balance AFTER swap
      const balanceAfter = await this.getActualJettonAmount(
        this.config.relayerWalletAddress, // Check relayer's jetton balance
        txId,
        0n,
      );
      this.logger.debug(`[DEBUG] Jetton balance AFTER swap: ${balanceAfter}`);
      
      // Calculate actual jetton amount received from this swap
      const actualJettonAmount = balanceAfter - balanceBefore;

      this.logger.log(`[DEBUG] Swap completed: received ${actualJettonAmount} jettons (balance: ${balanceBefore} -> ${balanceAfter})`);

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
      
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();
      
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
      // Ensure router is initialized
      if (!this.router || !this.contracts || !this.routerInfo) {
        this.logger.warn("Router not initialized yet, waiting...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this.router || !this.contracts || !this.routerInfo) {
          throw new Error("Router initialization failed");
        }
      }
      
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();

      // Use jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;

      // Use contracts from dexFactory (correct approach)
      const poolAddress = this.routerInfo.poolAddress || "EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf";
      const pool = this.client.open(this.contracts.Pool.create(Address.parse(poolAddress)));

      if (!pool) {
        this.logger.warn("Pool not found, using fallback rate");
        return 10000n; // Fallback rate
      }
      
      if (!pool.address) {
        this.logger.warn("Pool found but missing address property, using fallback rate");
        return 10000n; // Fallback rate
      }

      // Get pool data to calculate rate
      const poolData = await pool.getPoolData();
      // Pool reserves retrieved

      // Smart reserve detection with anomaly checking
      // Start with assumption: reserve0 = jetton, reserve1 = TON
      let tonReserve = poolData.reserve1;
      let jettonReserve = poolData.reserve0;
      
      // Initial assumption: reserve0=Jetton, reserve1=TON

      if (tonReserve === 0n || jettonReserve === 0n) {
        this.logger.warn("[DEBUG] Pool reserves are zero, using fallback rate");
        return 10000n;
      }

      // Calculate preliminary rate
      let rate = (jettonReserve * 95n) / (tonReserve * 100n);
      // Preliminary rate calculated

      // Check for anomalous rate (too high or too low)
      // Reasonable range: 1,000 to 1,000,000,000 nano-jettons per nano-TON
      if (rate > 1000000000000n || rate < 1000n) {
        this.logger.warn(`Suspicious rate: ${rate}, swapping reserves...`);
        
        // Swap reserves and recalculate
        [tonReserve, jettonReserve] = [jettonReserve, tonReserve];
        rate = (jettonReserve * 95n) / (tonReserve * 100n);
        
        this.logger.log(`Swapped reserves: reserve0=TON (${tonReserve}), reserve1=Jetton (${jettonReserve})`);
        this.logger.log(`Swapped rate: 1 TON = ${rate.toString()} nano-jettons`);
      }

      // Final validation
      if (rate === 0n) {
        this.logger.error(`Invalid rate: rate is 0 after calculation`);
        this.logger.error(`tonReserve=${tonReserve}, jettonReserve=${jettonReserve}`);
        this.logger.warn(`Using fallback rate due to invalid calculation`);
        return 10000n; // Fallback
      }

      this.logger.log(`Final swap rate: 1 TON = ${rate.toString()} nano-jettons (per nano-TON unit)`);
      
      return rate;
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
      // Ensure router is initialized
      if (!this.router || !this.contracts || !this.routerInfo) {
        this.logger.warn("Router not initialized yet, waiting...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this.router || !this.contracts || !this.routerInfo) {
          throw new Error("Router initialization failed");
        }
      }
      
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();

      // Basic amount constraints
      const minSwapAmount = 200000000n; // 0.2 TON minimum (increased for STON.fi)
      const maxSwapAmount = 1000000000000n; // 1000 TON maximum

      if (amountNanotons < minSwapAmount || amountNanotons > maxSwapAmount) {
        this.logger.warn(`Amount ${amountNanotons} is outside valid range (${minSwapAmount}-${maxSwapAmount})`);
        return false;
      }

      // Note: No need to check relayer balance since gas is already deducted from transaction amount
      // The gas amount (0.35 TON) is reserved from the incoming transaction
      // Gas already deducted from transaction amount, checking pool liquidity only

      // Get jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;

      try {
        // Use contracts from dexFactory (correct approach)
        const poolAddress = this.routerInfo.poolAddress || "EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf";
        const pool = this.client.open(this.contracts.Pool.create(Address.parse(poolAddress)));
        
        // Try to get pool data for liquidity check
        if (pool) {
          try {
            const poolData = await pool.getPoolData();
            
            // Smart reserve detection - same logic as getSwapRate()
            // Start with assumption: reserve0 = jetton, reserve1 = TON
            let tonReserve = poolData.reserve1;
            let jettonReserve = poolData.reserve0;
            
            // Check for anomalous rate to determine correct order
            const preliminaryRate = (jettonReserve * 95n) / (tonReserve * 100n);
            if (preliminaryRate > 1000000000000n || preliminaryRate < 1000n) {
              // Swap reserves if rate looks suspicious
              [tonReserve, jettonReserve] = [jettonReserve, tonReserve];
            }
            
            // Check if there's enough liquidity for the swap
            if (tonReserve === 0n || jettonReserve === 0n) {
              this.logger.warn(`Pool has zero reserves - cannot swap`);
              return false;
            }
            
            // Check if swap amount is reasonable compared to pool size
            // Don't allow swaps that would consume more than 10% of pool liquidity
            const maxSwapAmount = (tonReserve * 10n) / 100n; // 10% of pool
            if (amountNanotons > maxSwapAmount) {
              this.logger.warn(`Swap amount ${amountNanotons} exceeds 10% of pool liquidity (max: ${maxSwapAmount})`);
              return false;
            }
            
          } catch (poolDataError) {
            this.logger.error(`Failed to get pool data: ${poolDataError.message}`);
            return false;
          }
        }

        if (!pool) {
          this.logger.warn("Pool not found - insufficient liquidity or wrong jetton address");
          return false;
        }

        if (!pool.address) {
          this.logger.warn("Pool found but missing address property - check STON.fi API compatibility");
          return false;
        }
        
        return true;
      } catch (error) {
        this.logger.error(`Pool lookup failed: ${error.message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to check swap possibility: ${error.message}`);
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
      
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();
      
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
