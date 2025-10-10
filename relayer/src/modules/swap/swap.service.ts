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

    this.logger.log("Initializing STON.fi Router v2.2 CPI with SDK API...");

    // Initialize TON client
    this.client = new TonClient({
      endpoint: "https://toncenter.com/api/v2/jsonRPC",
      apiKey: process.env.TON_API_KEY,
    });

    // Initialize Router v2.2 for STON.fi
    const routerAddress = Address.parse("EQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250cN3");
    const routerContract = DEX.v2_2.Router.create(routerAddress);
    this.router = this.client.open(routerContract);

    this.logger.log("STON.fi Router v2.2 CPI initialized successfully");
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
      
      // Create pTON v2.1 instance for swap
      const proxyTon = pTON.v2_1.create(
        "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez" // pTON v1.0 MAINNET address
      );

      // IMPORTANT: Relayer performs swap from its own wallet, not user's wallet
      // Router v2.2 CPI automatically sends jettons to the wallet that performs the swap (relayer)
      const swapTxParams = await this.router.getSwapTonToJettonTxParams({
        userWalletAddress: Address.parse(this.config.relayerWalletAddress), // Relayer address, not user address
        proxyTon: proxyTon,
        offerAmount: amountNanotons,
        askJettonAddress: Address.parse(jettonMasterAddress), // Jetton master address
        minAskAmount: expectedJettonAmount, // Router v2.2 expects bigint, not string
        queryId: BigInt(Date.now()),
        referralAddress: undefined,
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
      
      const txHash = await this.tonService.sendInternalMessage(
        swapTxParams.to.toString(),
        BigInt(swapTxParams.value || swapTxParams.gasAmount),
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
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();

      // Use jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;

      // Create pTON v2.1 instance for pool lookup
      const proxyTon = pTON.v2_1.create(
        "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez" // pTON v1.0 MAINNET address
      );

      // Use hardcoded working pool address with DEX.v2_1.Pool (V2.1 SDK for V2 contract)
      const workingPoolAddress = "EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf";
      const pool = this.client.open(DEX.v2_1.Pool.create(Address.parse(workingPoolAddress)));

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
      this.logger.debug(`[DEBUG] Pool reserves: reserve0=${poolData.reserve0.toString()}, reserve1=${poolData.reserve1.toString()}`);

      // Determine token order - which reserve is TON and which is Jetton
      let tonReserve: bigint;
      let jettonReserve: bigint;
      
      // For RUBLE/TON pool on STON.fi:
      // reserve0 = RUBLE (larger number, but smaller value - ~22M RUBLE)
      // reserve1 = TON (smaller number, but larger value - ~213 TON)
      // This is because RUBLE price is very low (~$0.000026), TON is high (~$2.69)
      if (poolData.reserve0 > poolData.reserve1) {
        // reserve0 = Jetton (RUBLE - larger number)
        // reserve1 = TON (smaller number but higher value)
        tonReserve = poolData.reserve1;
        jettonReserve = poolData.reserve0;
        this.logger.debug(`[DEBUG] Detected: reserve0=Jetton/RUBLE (${jettonReserve}), reserve1=TON (${tonReserve})`);
      } else {
        // reserve1 = Jetton (larger number)
        // reserve0 = TON (smaller number but higher value)
        tonReserve = poolData.reserve0;
        jettonReserve = poolData.reserve1;
        this.logger.debug(`[DEBUG] Detected: reserve0=TON (${tonReserve}), reserve1=Jetton/RUBLE (${jettonReserve})`);
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
      // Ensure wallet is initialized before proceeding
      await this.tonService.forceWalletInitialization();

      // Basic amount constraints
      const minSwapAmount = 1000000n; // 0.001 TON minimum
      const maxSwapAmount = 1000000000000n; // 1000 TON maximum

      if (amountNanotons < minSwapAmount || amountNanotons > maxSwapAmount) {
        this.logger.warn(`Amount ${amountNanotons} is outside valid range (${minSwapAmount}-${maxSwapAmount})`);
        return false;
      }

      // Check relayer balance first
      const relayerBalance = await this.tonService.getWalletBalance();
      
      if (relayerBalance < amountNanotons + BigInt(this.config.gasForCallback)) {
        this.logger.warn(`Insufficient relayer balance: ${relayerBalance} < ${amountNanotons + BigInt(this.config.gasForCallback)}`);
        return false;
      }

      // Get jetton master address (not wallet address)
      const jettonMasterAddress = this.config.jettonMasterAddress;

      // Create pTON v2.1 instance for pool lookup
      const proxyTon = pTON.v2_1.create(
        "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez" // pTON v1.0 MAINNET address
      );

      try {
        // Use hardcoded working pool address with DEX.v2_1.Pool (V2.1 SDK for V2 contract)
        const workingPoolAddress = "EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf";
        const pool = this.client.open(DEX.v2_1.Pool.create(Address.parse(workingPoolAddress)));
        
        // Try to get pool data for liquidity check
        if (pool) {
          try {
            const poolData = await pool.getPoolData();
            
            // Determine token order - same logic as getSwapRate()
            // For RUBLE/TON pool: larger number = RUBLE, smaller number = TON
            let tonReserve: bigint;
            let jettonReserve: bigint;
            
            if (poolData.reserve0 > poolData.reserve1) {
              tonReserve = poolData.reserve1;
              jettonReserve = poolData.reserve0;
            } else {
              tonReserve = poolData.reserve0;
              jettonReserve = poolData.reserve1;
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
