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

    this.logger.log("Initializing STON.fi Router with SDK API...");

    // Initialize TON client
    this.client = new TonClient({
      endpoint: "https://toncenter.com/api/v2/jsonRPC",
      apiKey: process.env.TON_API_KEY,
    });

    // Initialize Router using DEX v1 API
    // Note: We create the router instance which has getPool() method
    const routerAddress = Address.parse("EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt");
    const routerContract = DEX.v1.Router.create(routerAddress);
    this.router = this.client.open(routerContract);

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
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();
      
      // Check if we can perform the swap
      const canSwap = await this.canSwap(amountNanotons);
      if (!canSwap) {
        throw new Error("Insufficient liquidity for swap");
      }

      // Get current swap rate
      const rate = await this.getSwapRate();
      this.logger.log(`[DEBUG] Got swap rate: ${rate} nano-jettons per nano-TON`);
      
      const expectedJettonAmount = (amountNanotons * rate) / 1_000_000_000n;
      this.logger.log(`[DEBUG] Calculated expected jetton amount: ${expectedJettonAmount} (from ${amountNanotons} nanotons * ${rate} / 10^9)`);

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
      
      // Create pTON instance for swap
      const proxyTon = pTON.v1.create(
        "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez" // pTON v1.0 MAINNET
      );

      // IMPORTANT: Relayer performs swap from its own wallet, not user's wallet
      // In Router v1, jettons are automatically sent to the wallet that performs the swap (relayer)
      const swapTxParams = await this.router.getSwapTonToJettonTxParams({
        userWalletAddress: Address.parse(this.config.relayerWalletAddress), // Relayer address, not user address
        proxyTon: proxyTon,
        offerAmount: amountNanotons,
        askJettonAddress: Address.parse(jettonMasterAddress), // Jetton master address
        minAskAmount: expectedJettonAmount.toString(),
        queryId: BigInt(Date.now()),
        referralAddress: undefined,
        // Note: additionalData is not supported in Router v1 - jettons go to relayer wallet
      });
      
      this.logger.log(`[DEBUG] ✅ Swap transaction parameters built successfully:`);
      this.logger.log(`[DEBUG]   - Destination: ${swapTxParams.to.toString()}`);
      this.logger.log(`[DEBUG]   - Gas amount: ${swapTxParams.gasAmount}`);
      this.logger.log(`[DEBUG]   - Payload size: ${swapTxParams.payload ? swapTxParams.payload.bits.length : 0} bits`);
      this.logger.log(`[DEBUG]   - Swap from: ${this.config.relayerWalletAddress} (relayer)`);
      this.logger.log(`[DEBUG]   - Asking for: ${jettonMasterAddress} (jetton master)`);
      this.logger.log(`[DEBUG]   - Jettons will be delivered to: ${this.config.relayerWalletAddress} (relayer wallet)`);
      this.logger.log(`[DEBUG]   - Amount in: ${amountNanotons} nanotons`);
      this.logger.log(`[DEBUG]   - Expected out: ${expectedJettonAmount} jettons`);

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
      this.logger.debug(`[DEBUG] Getting swap rate for TON -> Jetton`);

      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();

      // Use jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;
      this.logger.debug(`[DEBUG] Using jetton master address: ${jettonMasterAddress}`);

      // Create pTON instance for pool lookup
      const proxyTon = pTON.v1.create(
        "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez" // pTON v1.0 MAINNET
      );

      // Get pool using STON.fi router with correct parameters (Router v1 API)
      // Parse addresses and log them
      const ptonAddress = Address.parse("EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez");
      const jettonAddress = Address.parse(jettonMasterAddress);
      
      this.logger.debug(`[DEBUG] pTON address for rate: ${ptonAddress.toString()}`);
      this.logger.debug(`[DEBUG] Jetton address for rate: ${jettonAddress.toString()}`);
      this.logger.debug(`[DEBUG] Address array for rate: [${ptonAddress.toString()}, ${jettonAddress.toString()}]`);
      
      // Use hardcoded working pool address with DEX.v2_1.Pool (V2.1 SDK for V2 contract)
      const workingPoolAddress = "EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf";
      this.logger.debug(`[DEBUG] Using hardcoded working pool address for rate: ${workingPoolAddress}`);
      
      const pool = this.client.open(DEX.v2_1.Pool.create(Address.parse(workingPoolAddress)));
      
      this.logger.debug(`[DEBUG] Pool created with hardcoded address for rate: ${pool ? 'success' : 'failed'}`);
      this.logger.debug(`[DEBUG] Pool type for rate: ${typeof pool}`);
      this.logger.debug(`[DEBUG] Pool constructor for rate: ${pool?.constructor?.name || 'null'}`);
      this.logger.debug(`[DEBUG] Pool address for rate: ${pool?.address?.toString() || 'N/A'}`);
      this.logger.debug(`[DEBUG] Using DEX.v2_1.Pool for stonfi_pool_v2 contract for rate`);

      // Add detailed logging for pool object (avoid JSON.stringify with BigInt)
      this.logger.debug(`[DEBUG] Pool object exists for rate: ${pool ? 'yes' : 'no'}`);
      this.logger.debug(`[DEBUG] Pool type: ${typeof pool}`);
      this.logger.debug(`[DEBUG] Pool address type: ${typeof pool?.address}`);
      this.logger.debug(`[DEBUG] Pool address value: ${pool?.address}`);
      this.logger.debug(`[DEBUG] Pool keys: ${pool ? Object.keys(pool) : 'null'}`);
      this.logger.debug(`[DEBUG] Pool constructor: ${pool?.constructor?.name || 'unknown'}`);
      this.logger.debug(`[DEBUG] Pool toString: ${pool?.toString?.() || 'no toString method'}`);
      
      // Try to get pool data for debugging
      if (pool) {
        try {
          this.logger.debug(`[DEBUG] Attempting to get pool data for rate...`);
          const poolData = await pool.getPoolData();
          this.logger.debug(`[DEBUG] Pool data retrieved successfully for rate`);
          this.logger.debug(`[DEBUG] Pool reserve0 for rate: ${poolData.reserve0.toString()}`);
          this.logger.debug(`[DEBUG] Pool reserve1 for rate: ${poolData.reserve1.toString()}`);
            this.logger.debug(`[DEBUG] Pool protocol fee for rate: ${poolData.protocolFee.toString()}`);
        } catch (poolDataError) {
          this.logger.error(`[DEBUG] Failed to get pool data for rate: ${poolDataError.message}`);
        }
      }

      this.logger.debug(`[DEBUG] Pool lookup for rate calculation: ${pool ? 'found' : 'not found'}`);
      if (!pool) {
        this.logger.warn("[DEBUG] Pool not found (undefined), using fallback rate");
        return 10000n; // Fallback rate
      }
      
      if (!pool.address) {
        this.logger.warn("[DEBUG] Pool found but missing address property, using fallback rate");
        return 10000n; // Fallback rate
      }
      
      // Safe toString call with additional check
      try {
        this.logger.debug(`[DEBUG] Using pool ${pool.address.toString()} for rate calculation`);
      } catch (toStringError) {
        this.logger.error(`[DEBUG] Failed to convert pool address to string for rate: ${toStringError.message}`);
        this.logger.error(`[DEBUG] Pool address object:`, pool.address);
        this.logger.warn("[DEBUG] Using fallback rate due to toString error");
        return 10000n; // Fallback rate
      }

      // Get pool data to calculate rate
      const poolData = await pool.getPoolData();
      this.logger.debug(`[DEBUG] Pool reserves: reserve0=${poolData.reserve0.toString()}, reserve1=${poolData.reserve1.toString()}`);

      // Determine token order - which reserve is TON and which is Jetton
      let tonReserve: bigint;
      let jettonReserve: bigint;
      
      // Check by reserve size (TON reserve is usually larger in TON/Jetton pools)
      // This is a heuristic - in production you might want to check token addresses
      if (poolData.reserve0 > poolData.reserve1) {
        // reserve0 = TON (larger reserve)
        tonReserve = poolData.reserve0;
        jettonReserve = poolData.reserve1;
        this.logger.debug(`[DEBUG] Detected: reserve0=TON (${tonReserve}), reserve1=Jetton (${jettonReserve})`);
      } else {
        // reserve1 = TON
        tonReserve = poolData.reserve1;
        jettonReserve = poolData.reserve0;
        this.logger.debug(`[DEBUG] Detected: reserve0=Jetton (${jettonReserve}), reserve1=TON (${tonReserve})`);
      }

      if (tonReserve === 0n || jettonReserve === 0n) {
        this.logger.warn("[DEBUG] Pool reserves are zero, using fallback rate");
        return 10000n;
      }

      // CORRECTED FORMULA: How many nano-jettons per nano-TON
      // Formula: (jettonReserve * 10^9 * 95) / (tonReserve * 100)
      // The 10^9 multiplier ensures we get the rate in proper scale
      // 95/100 = 5% slippage protection
      const rate = (jettonReserve * 10n ** 9n * 95n) / (tonReserve * 100n);

      this.logger.log(`[DEBUG] Corrected swap rate: 1 TON = ${rate.toString()} nano-jettons (per nano-TON unit)`);
      
      // Validate result
      if (rate === 0n) {
        this.logger.error(`[DEBUG] Invalid rate: rate is 0 after calculation`);
        this.logger.error(`[DEBUG] tonReserve=${tonReserve}, jettonReserve=${jettonReserve}`);
        this.logger.warn(`[DEBUG] Using fallback rate due to invalid calculation`);
        return 10000n; // Fallback
      }
      
      // Sanity check - rate shouldn't be unreasonably high (> 1M jettons per TON)
      if (rate > 1000000000000n) {
        this.logger.warn(`[DEBUG] Suspicious rate: ${rate}, might indicate wrong reserve order`);
        this.logger.warn(`[DEBUG] Double-check: tonReserve=${tonReserve}, jettonReserve=${jettonReserve}`);
      }
      
      return rate;
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to get swap rate: ${error.message}`);
      this.logger.error(`[DEBUG] Error details:`, error);
      this.logger.error(`[DEBUG] Error stack:`, error.stack);
      this.logger.error(`[DEBUG] Error name: ${error.name}`);
      this.logger.error(`[DEBUG] Error constructor: ${error.constructor?.name}`);
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

      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();

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
      const proxyTon = pTON.v1.create(
        "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez" // pTON v1.0 MAINNET
      );

      this.logger.debug(`[DEBUG] pTON instance created: ${proxyTon.address?.toString() || 'no address'}`);

      try {
        this.logger.debug(`[DEBUG] Looking up pool with jetton addresses: [${"EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez"}, ${jettonMasterAddress}]`);
        
        // Log router state before call
        this.logger.debug(`[DEBUG] Router instance: ${this.router ? 'exists' : 'null'}`);
        this.logger.debug(`[DEBUG] Router type: ${typeof this.router}`);
        this.logger.debug(`[DEBUG] Router constructor: ${this.router?.constructor?.name || 'unknown'}`);
        this.logger.debug(`[DEBUG] Router methods: ${this.router ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.router)) : 'null'}`);
        this.logger.debug(`[DEBUG] Router getPool method: ${typeof this.router?.getPool}`);
        
        // Router v1 API requires array of Address objects, not strings
        this.logger.debug(`[DEBUG] Looking up pool with jetton addresses: [${"EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez"}, ${jettonMasterAddress}]`);
        
        // Parse addresses and log them
        const ptonAddress = Address.parse("EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez");
        const jettonAddress = Address.parse(jettonMasterAddress);
        
        this.logger.debug(`[DEBUG] pTON address: ${ptonAddress.toString()}`);
        this.logger.debug(`[DEBUG] Jetton address: ${jettonAddress.toString()}`);
        this.logger.debug(`[DEBUG] Address array: [${ptonAddress.toString()}, ${jettonAddress.toString()}]`);
        
        // Use hardcoded working pool address with DEX.v2_1.Pool (V2.1 SDK for V2 contract)
        const workingPoolAddress = "EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf";
        this.logger.debug(`[DEBUG] Using hardcoded working pool address: ${workingPoolAddress}`);
        
        const pool = this.client.open(DEX.v2_1.Pool.create(Address.parse(workingPoolAddress)));
        
        this.logger.debug(`[DEBUG] Pool created with hardcoded address: ${pool ? 'success' : 'failed'}`);
        this.logger.debug(`[DEBUG] Pool type: ${typeof pool}`);
        this.logger.debug(`[DEBUG] Pool constructor: ${pool?.constructor?.name || 'null'}`);
        this.logger.debug(`[DEBUG] Pool address: ${pool?.address?.toString() || 'N/A'}`);
        this.logger.debug(`[DEBUG] Using DEX.v2_1.Pool for stonfi_pool_v2 contract`);

        // Add detailed logging for pool object (avoid JSON.stringify with BigInt)
        this.logger.debug(`[DEBUG] Pool object exists: ${pool ? 'yes' : 'no'}`);
        this.logger.debug(`[DEBUG] Pool type: ${typeof pool}`);
        this.logger.debug(`[DEBUG] Pool address type: ${typeof pool?.address}`);
        this.logger.debug(`[DEBUG] Pool address value: ${pool?.address}`);
        this.logger.debug(`[DEBUG] Pool keys: ${pool ? Object.keys(pool) : 'null'}`);
        this.logger.debug(`[DEBUG] Pool constructor: ${pool?.constructor?.name || 'unknown'}`);
        this.logger.debug(`[DEBUG] Pool toString: ${pool?.toString?.() || 'no toString method'}`);
        
        // Try to get pool data for debugging and liquidity check
        if (pool) {
          try {
            this.logger.debug(`[DEBUG] Attempting to get pool data...`);
            const poolData = await pool.getPoolData();
            this.logger.debug(`[DEBUG] Pool data retrieved successfully`);
            this.logger.debug(`[DEBUG] Pool reserve0: ${poolData.reserve0.toString()}`);
            this.logger.debug(`[DEBUG] Pool reserve1: ${poolData.reserve1.toString()}`);
            this.logger.debug(`[DEBUG] Pool protocol fee: ${poolData.protocolFee.toString()}`);
            
            // Determine token order - same logic as getSwapRate()
            let tonReserve: bigint;
            let jettonReserve: bigint;
            
            if (poolData.reserve0 > poolData.reserve1) {
              tonReserve = poolData.reserve0;
              jettonReserve = poolData.reserve1;
              this.logger.debug(`[DEBUG] Detected in canSwap: reserve0=TON (${tonReserve}), reserve1=Jetton (${jettonReserve})`);
            } else {
              tonReserve = poolData.reserve1;
              jettonReserve = poolData.reserve0;
              this.logger.debug(`[DEBUG] Detected in canSwap: reserve0=Jetton (${jettonReserve}), reserve1=TON (${tonReserve})`);
            }
            
            // Check if there's enough liquidity for the swap
            if (tonReserve === 0n || jettonReserve === 0n) {
              this.logger.warn(`[DEBUG] Pool has zero reserves - cannot swap`);
              return false;
            }
            
            // Check if swap amount is reasonable compared to pool size
            // Don't allow swaps that would consume more than 10% of pool liquidity
            const maxSwapAmount = (tonReserve * 10n) / 100n; // 10% of pool
            if (amountNanotons > maxSwapAmount) {
              this.logger.warn(`[DEBUG] Swap amount ${amountNanotons} exceeds 10% of pool liquidity (max: ${maxSwapAmount})`);
              return false;
            }
            
            this.logger.debug(`[DEBUG] Liquidity check passed: pool can handle ${amountNanotons} nanotons swap`);
          } catch (poolDataError) {
            this.logger.error(`[DEBUG] Failed to get pool data: ${poolDataError.message}`);
            return false;
          }
        }

        if (!pool) {
          this.logger.warn("[DEBUG] Pool not found (undefined) - insufficient liquidity or wrong jetton address");
          return false;
        }

        if (!pool.address) {
          this.logger.warn("[DEBUG] Pool found but missing address property - check STON.fi API compatibility");
          return false;
        }

        // Safe toString call with additional check
        try {
          this.logger.debug(`[DEBUG] Pool found at: ${pool.address.toString()}`);
        } catch (toStringError) {
          this.logger.error(`[DEBUG] Failed to convert pool address to string: ${toStringError.message}`);
          this.logger.error(`[DEBUG] Pool address object:`, pool.address);
          return false;
        }
        
        return true;
      } catch (error) {
        this.logger.error(`[DEBUG] Pool lookup failed: ${error.message}`);
        this.logger.error(`[DEBUG] Error details:`, error);
        this.logger.error(`[DEBUG] Error stack:`, error.stack);
        this.logger.error(`[DEBUG] Error name: ${error.name}`);
        this.logger.error(`[DEBUG] Error constructor: ${error.constructor?.name}`);
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
