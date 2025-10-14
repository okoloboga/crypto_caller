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
        routers = await stonApi.getRouters();
      } catch (apiError) {
        this.logger.warn(`[DEBUG] Failed to get routers from API: ${apiError.message}`);
        this.logger.warn(`[DEBUG] Using fallback router address`);
        
        const fallbackRouterAddress = "EQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250cN3";
        this.routerInfo = await stonApi.getRouter(fallbackRouterAddress);
        
        // ⚠️ ДИАГНОСТИКА: Логируем полную информацию о роутере
        this.logger.debug(`[DEBUG] Fallback router info:`, {
          address: this.routerInfo.address,
          majorVersion: this.routerInfo.majorVersion,
          minorVersion: this.routerInfo.minorVersion,
          routerType: this.routerInfo.routerType,
          ptonMasterAddress: this.routerInfo.ptonMasterAddress,
          ptonVaultAddress: this.routerInfo.ptonVaultAddress,
          allKeys: Object.keys(this.routerInfo),
        });
        
        this.contracts = dexFactory(this.routerInfo);
        this.router = this.client.open(this.contracts.Router.create(Address.parse(this.routerInfo.address)));
        this.logger.log("STON.fi Router v2.2 initialized successfully with fallback address");
        return;
      }
      
      this.logger.debug(`[DEBUG] Found ${routers.length} routers`);
      
      routers.forEach((r, index) => {
        this.logger.debug(`[DEBUG] Router ${index}: ${r.address} (v${r.majorVersion}.${r.minorVersion}, ${r.routerType}, ${r.network})`);
      });
      
      const targetRouter = routers
        .filter(r => r.majorVersion === 2 && r.minorVersion === 2 && r.routerType === "ConstantProduct")
        .at(-1);
      
      if (!targetRouter) {
        this.logger.error(`[DEBUG] No Router v2.2 ConstantProduct found. Available routers:`);
        routers.forEach(r => {
          this.logger.error(`[DEBUG] - ${r.address} (v${r.majorVersion}.${r.minorVersion}, ${r.routerType}, ${r.network})`);
        });
        throw new Error("No Router v2.2 ConstantProduct found");
      }
      
      const routerAddress = targetRouter.address;
      this.logger.log(`[DEBUG] Selected router: ${routerAddress} (v${targetRouter.majorVersion}.${targetRouter.minorVersion})`);
      
      this.routerInfo = await stonApi.getRouter(routerAddress);
      
      // ⚠️ ДИАГНОСТИКА: Логируем ВСЮ информацию о роутере
      this.logger.debug(`[DEBUG] Complete router info:`, {
        address: this.routerInfo.address,
        majorVersion: this.routerInfo.majorVersion,
        minorVersion: this.routerInfo.minorVersion,
        routerType: this.routerInfo.routerType,
        ptonMasterAddress: this.routerInfo.ptonMasterAddress,
        ptonVaultAddress: this.routerInfo.ptonVaultAddress,
        ptonWalletAddress: this.routerInfo.ptonWalletAddress,
        poolAddress: this.routerInfo.poolAddress,
        allKeys: Object.keys(this.routerInfo),
        fullObject: JSON.stringify(this.routerInfo, null, 2),
      });
      
      this.contracts = dexFactory(this.routerInfo);
      this.logger.debug(`[DEBUG] Contracts created:`, Object.keys(this.contracts));
      
      // ⚠️ ДИАГНОСТИКА: Проверяем, что Router контракт создан правильно
      const routerContract = this.contracts.Router.create(Address.parse(this.routerInfo.address));
      this.logger.debug(`[DEBUG] Router contract address: ${routerContract.address?.toString()}`);
      
    this.router = this.client.open(routerContract);

      this.logger.log("STON.fi Router v2.2 initialized successfully with dexFactory");
    } catch (error) {
      this.logger.error(`Failed to initialize Router: ${error.message}`);
      this.logger.error(`Error stack:`, error.stack);
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

      const jettonMasterAddress = this.config.jettonMasterAddress;
      this.logger.debug(`[DEBUG] Using jetton master address: ${jettonMasterAddress}`);

      // ⚠️ ДИАГНОСТИКА: Логируем всю информацию о роутере
      this.logger.debug(`[DEBUG] Router info before swap:`, {
        routerAddress: this.routerInfo.address,
        ptonMasterAddress: this.routerInfo.ptonMasterAddress,
        ptonVaultAddress: this.routerInfo.ptonVaultAddress,
        majorVersion: this.routerInfo.majorVersion,
        minorVersion: this.routerInfo.minorVersion,
        routerType: this.routerInfo.routerType,
      });

      // Create pTON using dexFactory
      const proxyTon = this.contracts.pTON.create(this.routerInfo.ptonMasterAddress);
      
      this.logger.debug(`[DEBUG] Created pTON contract:`, {
        ptonAddress: proxyTon.address?.toString(),
        ptonMasterFromInfo: this.routerInfo.ptonMasterAddress,
      });

      // Calculate minAskAmount with 5% slippage tolerance
      const minAskAmount = (expectedJettonAmount * 95n) / 100n;
      
      this.logger.debug(`[DEBUG] Expected jettons: ${expectedJettonAmount}`);
      this.logger.debug(`[DEBUG] Min ask amount (with 5% slippage): ${minAskAmount}`);

      // ⚠️ НОВЫЙ ПОДХОД: Прямой вызов Router без pTON
      this.logger.log(`[DEBUG] Using direct Router approach (bypassing pTON)`);
      
      // Получаем jetton wallet address для Router
      const askJettonWalletAddress = await this.tonService.getJettonWalletAddress();
      this.logger.debug(`[DEBUG] Router jetton wallet address: ${askJettonWalletAddress?.toString()}`);
      
      // Проверяем все параметры перед вызовом createSwapBody
      if (!this.config.relayerWalletAddress) {
        throw new Error('relayerWalletAddress is undefined in config');
      }

      if (!minAskAmount) {
        throw new Error('minAskAmount is undefined');
      }

      if (!askJettonWalletAddress) {
        throw new Error('askJettonWalletAddress is undefined');
      }

      this.logger.debug(`[DEBUG] createSwapBody parameters:`, {
        userWalletAddress: this.config.relayerWalletAddress,
        minAskAmount: minAskAmount.toString(),
        askJettonWalletAddress: askJettonWalletAddress.toString(),
        referralAddress: undefined
      });

      // Создаем правильный swap body с DEX_OP_CODES.SWAP
      const swapBody = await this.router.createSwapBody({
        userWalletAddress: this.config.relayerWalletAddress,
        minAskAmount: minAskAmount,
        askJettonWalletAddress: askJettonWalletAddress.toString(),
        referralAddress: undefined
      });
      
      this.logger.debug(`[DEBUG] Created swap body with DEX_OP_CODES.SWAP`);
      this.logger.debug(`[DEBUG] Swap body size: ${swapBody.bits.length} bits`);
      
      // Создаем параметры транзакции напрямую
      const gasAmount = 300_000_000n; // 0.3 TON
      const totalValue = amountNanotons + gasAmount;
      
      const swapTxParams = {
        to: this.routerInfo.address, // Прямо на Router!
        value: totalValue,
        body: swapBody
      };
      
      this.logger.debug(`[DEBUG] Direct Router transaction params:`, {
        to: swapTxParams.to,
        value: swapTxParams.value.toString(),
        bodySize: swapTxParams.body.bits.length,
        amountNanotons: amountNanotons.toString(),
        gasAmount: gasAmount.toString(),
        totalValue: totalValue.toString()
      });
      
      const actualBody = swapTxParams.body;
      
      if (!actualBody) {
        throw new Error('No message body in swapTxParams - cannot send swap transaction');
      }
      
      // ⚠️ ПРОВЕРКА: Прямой Router подход
      const finalDestination = swapTxParams.to;
      const expectedRouterAddress = this.routerInfo.address;
      
      this.logger.log(`[DEBUG] Direct Router destination: ${finalDestination}`);
      this.logger.log(`[DEBUG] Expected router address: ${expectedRouterAddress}`);
      
      if (finalDestination !== expectedRouterAddress) {
        this.logger.error(`[DEBUG] ❌ ROUTER MISMATCH: Wrong destination address!`);
        this.logger.error(`[DEBUG]   Direct destination: ${finalDestination}`);
        this.logger.error(`[DEBUG]   Expected router: ${expectedRouterAddress}`);
        throw new Error(`Router address mismatch: ${finalDestination} != ${expectedRouterAddress}`);
      } else {
        this.logger.log(`[DEBUG] ✅ Direct Router address is correct`);
      }
      
      this.logger.log(`[DEBUG] ✅ Swap transaction parameters built successfully:`);
      this.logger.log(`[DEBUG]   - Final destination: ${finalDestination}`);
      this.logger.log(`[DEBUG]   - Value (gas): ${swapTxParams.value}`);
      this.logger.log(`[DEBUG]   - Body size: ${actualBody.bits.length} bits`);
      this.logger.log(`[DEBUG]   - Amount in: ${amountNanotons} nanotons`);
      this.logger.log(`[DEBUG]   - Expected out: ${expectedJettonAmount} nano-jettons`);
      this.logger.log(`[DEBUG]   - Min ask amount: ${minAskAmount} nano-jettons`);

      // Get jetton balance BEFORE swap
      const balanceBefore = await this.getActualJettonAmount(
        this.config.relayerWalletAddress,
        txId,
        0n,
      );
      this.logger.debug(`[DEBUG] Jetton balance BEFORE swap: ${balanceBefore}`);
      
      // Send transaction directly to Router
      const value = BigInt(swapTxParams.value);
      
      this.logger.log(`[DEBUG] Sending direct Router transaction:`);
      this.logger.log(`[DEBUG]   - Destination: ${finalDestination}`);
      this.logger.log(`[DEBUG]   - Value: ${value} nano-TON`);
      this.logger.log(`[DEBUG]   - Body size: ${actualBody.bits.length} bits`);
      this.logger.log(`[DEBUG]   - Method: DEX_OP_CODES.SWAP (direct Router call)`);
      
      const txHash = await this.tonService.sendInternalMessage(
        finalDestination,
        value,
        actualBody,
      );

      this.logger.log(`[DEBUG] Swap transaction sent: ${txHash}`);

      // Wait for confirmation
      this.logger.log(`[DEBUG] Waiting for transaction confirmation...`);
      const confirmed = await this.waitForTransactionConfirmation(
        txHash,
        60000,
      );

      if (!confirmed) {
        this.logger.error(`[DEBUG] Transaction confirmation timeout for ${txHash}`);
        
        await new Promise((resolve) => setTimeout(resolve, 10000));
        
        const balanceAfterTimeout = await this.getActualJettonAmount(
          this.config.relayerWalletAddress,
          txId,
          0n,
        );
        
        if (balanceAfterTimeout > balanceBefore) {
          const actualJettonAmount = balanceAfterTimeout - balanceBefore;
          this.logger.warn(`[DEBUG] Transaction confirmed after timeout! Received ${actualJettonAmount} jettons`);
          return {
            jettonAmount: actualJettonAmount,
            success: true,
          };
        }
        
        return {
          jettonAmount: 0n,
          success: false,
          error: "Transaction confirmation timeout",
        };
      }

      // Wait for balance update
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get jetton balance AFTER swap
      const balanceAfter = await this.getActualJettonAmount(
        this.config.relayerWalletAddress,
        txId,
        0n,
      );
      this.logger.debug(`[DEBUG] Jetton balance AFTER swap: ${balanceAfter}`);
      
      const actualJettonAmount = balanceAfter - balanceBefore;

      if (actualJettonAmount === 0n) {
        this.logger.error(`[DEBUG] ⚠️ No jettons received! Checking transaction details...`);
        
        const tx = await this.tonService.getTransaction(txHash);
        this.logger.error(`[DEBUG] Transaction details:`, JSON.stringify(tx, null, 2));
        
        // Дополнительная диагностика: проверяем, куда ушли деньги
        this.logger.error(`[DEBUG] Diagnostic info:`);
        this.logger.error(`[DEBUG]   - Sent to: ${finalDestination}`);
        this.logger.error(`[DEBUG]   - Router address: ${this.routerInfo.address}`);
        this.logger.error(`[DEBUG]   - Method used: DEX_OP_CODES.SWAP (direct Router call)`);
        this.logger.error(`[DEBUG]   - Amount sent: ${amountNanotons} nano-TON`);
        this.logger.error(`[DEBUG]   - Gas amount: ${gasAmount} nano-TON`);
        this.logger.error(`[DEBUG]   - Total value: ${value} nano-TON`);
        this.logger.error(`[DEBUG]   - Body size: ${actualBody.bits.length} bits`);
        this.logger.error(`[DEBUG]   - Min ask amount: ${minAskAmount} nano-jettons`);
        this.logger.error(`[DEBUG]   - Expected jettons: ${expectedJettonAmount} nano-jettons`);
        
        return {
          jettonAmount: 0n,
          success: false,
          error: "No jettons received from swap",
        };
      }

      this.logger.log(`[DEBUG] ✅ Swap completed: received ${actualJettonAmount} nano-jettons (balance: ${balanceBefore} -> ${balanceAfter})`);

      return {
        jettonAmount: actualJettonAmount,
        success: true,
      };
    } catch (error) {
      this.logger.error(`[DEBUG] STON.fi swap failed: ${error.message}`);
      this.logger.error(`[DEBUG] Error stack:`, error.stack);
      return {
        jettonAmount: 0n,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Wait for transaction confirmation - УЛУЧШЕННАЯ ВЕРСИЯ
   */
  private async waitForTransactionConfirmation(
    txHash: string,
    timeoutMs: number,
  ): Promise<boolean> {
    const startTime = Date.now();
    let attempts = 0;

    this.logger.debug(`[DEBUG] Waiting for transaction confirmation: ${txHash}`);

    while (Date.now() - startTime < timeoutMs) {
      attempts++;
      
      try {
        // Проверяем транзакцию через API
        const tx = await this.tonService.getTransaction(txHash);
        
        this.logger.debug(`[DEBUG] Transaction check attempt ${attempts}:`, {
          found: !!tx,
          success: tx?.success,
          hash: txHash,
        });
        
        if (tx) {
          if (tx.success === true) {
            this.logger.log(`[DEBUG] ✅ Transaction confirmed successfully after ${attempts} attempts`);
          return true;
          } else if (tx.success === false) {
            this.logger.error(`[DEBUG] ❌ Transaction failed in blockchain:`, tx);
            return false;
          }
        }
      } catch (error) {
        this.logger.debug(`[DEBUG] Transaction not found yet (attempt ${attempts}): ${error.message}`);
      }

      // Прогрессивное ожидание: 2s -> 3s -> 5s
      const waitTime = attempts < 3 ? 2000 : attempts < 6 ? 3000 : 5000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.logger.warn(`[DEBUG] Transaction confirmation timeout after ${attempts} attempts`);
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
   * Get current swap rate (TON -> Jetton) - ИСПРАВЛЕННАЯ ВЕРСИЯ
   */
  async getSwapRate(): Promise<bigint> {
    try {
      if (!this.router || !this.contracts || !this.routerInfo) {
        this.logger.warn("Router not initialized yet, waiting...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this.router || !this.contracts || !this.routerInfo) {
          throw new Error("Router initialization failed");
        }
      }
      
      await this.tonService.forceWalletInitialization();

      const poolAddress = this.routerInfo.poolAddress || "EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf";
      const pool = this.client.open(this.contracts.Pool.create(Address.parse(poolAddress)));

      if (!pool || !pool.address) {
        this.logger.warn("Pool not found, using fallback rate");
        return 90000n; // Fallback rate
      }

      const poolData = await pool.getPoolData();
      
      this.logger.debug(`[DEBUG] Pool reserves:`, {
        reserve0: poolData.reserve0.toString(),
        reserve1: poolData.reserve1.toString(),
      });

      // Smart reserve detection
      let tonReserve: bigint;
      let jettonReserve: bigint;
      
      if (poolData.reserve0 < 10n ** 15n && poolData.reserve1 > 10n ** 15n) {
        tonReserve = poolData.reserve0;
        jettonReserve = poolData.reserve1;
        this.logger.debug(`[DEBUG] Detected: reserve0=TON, reserve1=JETTON`);
      } else if (poolData.reserve1 < 10n ** 15n && poolData.reserve0 > 10n ** 15n) {
        tonReserve = poolData.reserve1;
        jettonReserve = poolData.reserve0;
        this.logger.debug(`[DEBUG] Detected: reserve1=TON, reserve0=JETTON`);
      } else {
        tonReserve = poolData.reserve1;
        jettonReserve = poolData.reserve0;
        this.logger.warn(`[DEBUG] Could not auto-detect reserves, using fallback order`);
      }

      if (tonReserve === 0n || jettonReserve === 0n) {
        this.logger.warn("Pool reserves are zero, using fallback rate");
        return 90000n;
      }

      // Calculate rate: jettons per TON (with 0.3% fee)
      // Formula: (jettonReserve * 997) / (tonReserve * 1000)
      const rate = (jettonReserve * 997n) / (tonReserve * 1000n);

      this.logger.log(`[DEBUG] Swap rate calculation:`);
      this.logger.log(`[DEBUG]   - TON reserve: ${tonReserve.toString()}`);
      this.logger.log(`[DEBUG]   - Jetton reserve: ${jettonReserve.toString()}`);
      this.logger.log(`[DEBUG]   - Rate: 1 nano-TON = ${rate.toString()} nano-jettons`);
      this.logger.log(`[DEBUG]   - Rate: 1 TON = ${(rate * 1_000_000_000n).toString()} nano-jettons`);

      if (rate === 0n) {
        this.logger.error(`Invalid rate: rate is 0 after calculation`);
        return 90000n;
      }

      return rate;
    } catch (error) {
      this.logger.error(`Failed to get swap rate: ${error.message}`);
      return 90000n;
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
            
            // Smart reserve detection by size heuristic - same logic as getSwapRate()
            let tonReserve: bigint;
            let jettonReserve: bigint;
            
            if (poolData.reserve0 < 10n ** 15n && poolData.reserve1 > 10n ** 15n) {
              tonReserve = poolData.reserve0;
              jettonReserve = poolData.reserve1;
            } else if (poolData.reserve1 < 10n ** 15n && poolData.reserve0 > 10n ** 15n) {
              tonReserve = poolData.reserve1;
              jettonReserve = poolData.reserve0;
            } else {
              tonReserve = poolData.reserve1;
              jettonReserve = poolData.reserve0;
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
