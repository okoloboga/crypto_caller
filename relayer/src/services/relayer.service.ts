import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
// ✅ УБРАНО: Cron, CronExpression - больше не нужны, так как нет автоматического сканирования
import Bottleneck from "bottleneck";

import { TonService } from "../modules/ton/ton.service";
import { SwapService } from "../modules/swap/swap.service";
import { BurnService } from "../modules/burn/burn.service";
import { MonitoringService } from "../modules/monitoring/monitoring.service";
import { MetricsService } from "../modules/monitoring/metrics.service";
import { BackendNotificationService } from "./backend-notification.service";
import {
  TransactionEntity,
  TransactionStatus,
} from "../entities/transaction.entity";
import { RelayerConfig } from "../config/relayer.config";

@Injectable()
export class RelayerService implements OnModuleInit {
  private readonly logger = new Logger(RelayerService.name);
  private readonly config: RelayerConfig;
  private readonly limiter: Bottleneck;
  private isRunning = false;

  constructor(
    private configService: ConfigService,
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
    private tonService: TonService,
    private swapService: SwapService,
    private burnService: BurnService,
    private monitoringService: MonitoringService,
    private metricsService: MetricsService,
    private backendNotificationService: BackendNotificationService,
  ) {
    this.config = this.configService.get<RelayerConfig>("relayer");

    // Rate limiter for RPC calls
    this.limiter = new Bottleneck({
      minTime: 200, // 200ms between requests
      maxConcurrent: 5,
    });
  }

  async onModuleInit() {
    this.logger.log("Relayer service initialized");

    // Check wallet balance
    await this.checkWalletBalance();

    // ✅ УБРАНО: startProcessingLoop - больше не нужен, так как нет автоматического сканирования
  }

  /**
   * Handle swap failure
   */
  private async handleSwapFailure(
    transaction: TransactionEntity,
    error?: string,
  ): Promise<void> {
    this.logger.error(`[DEBUG] Handling swap failure for transaction ${transaction.lt}: ${error}`);
    
    try {
      // Check relayer balance before attempting refund
      const relayerBalance = await this.tonService.getWalletBalance();
      this.logger.debug(`[DEBUG] Relayer balance before refund: ${relayerBalance} nanotons`);
      
      if (relayerBalance < BigInt(transaction.amountNanotons) + BigInt(this.config.gasForCallback)) {
        this.logger.error(`[DEBUG] Insufficient relayer balance for refund: ${relayerBalance} < ${BigInt(transaction.amountNanotons) + BigInt(this.config.gasForCallback)}`);
        
        // Mark as failed if insufficient balance for refund
        transaction.status = TransactionStatus.FAILED;
        transaction.errorMessage = `Swap failed: ${error}. Insufficient balance for refund: ${relayerBalance}`;
        transaction.processedAt = new Date();
        await this.transactionRepository.save(transaction);
        
        this.monitoringService.logError(
          new Error(`Insufficient balance for refund: ${relayerBalance}`),
          "handleSwapFailure",
          transaction.lt,
        );
        return;
      }

      // Send refund
      this.logger.log(`[DEBUG] Sending refund to user ${transaction.userAddress}: ${transaction.amountNanotons} nanotons`);
      await this.tonService.sendRefundUser(
        transaction.userAddress,
        BigInt(transaction.amountNanotons),
      );

      // Update transaction status
      transaction.status = TransactionStatus.REFUNDED;
      transaction.errorMessage = error || "Swap failed";
      transaction.processedAt = new Date();
      await this.transactionRepository.save(transaction);

      this.logger.log(`[DEBUG] Refund sent successfully for transaction ${transaction.lt}`);
      this.monitoringService.logTransactionComplete(transaction.lt, false);
    } catch (refundError) {
      this.logger.error(`[DEBUG] Refund failed for transaction ${transaction.lt}: ${refundError.message}`);
      this.logger.error(`[DEBUG] Refund error details:`, refundError);
      
      this.monitoringService.logError(
        refundError,
        "handleSwapFailure",
        transaction.lt,
      );

      // Mark as failed if refund also failed
      transaction.status = TransactionStatus.FAILED;
      transaction.errorMessage = `Swap failed: ${error}. Refund failed: ${refundError.message}`;
      transaction.processedAt = new Date();
      await this.transactionRepository.save(transaction);
      
      // Log for manual intervention
      this.logger.error(`[DEBUG] CRITICAL: Transaction ${transaction.lt} requires manual intervention - both swap and refund failed`);
    }
  }

  /**
   * Handle burn failure
   */
  private async handleBurnFailure(
    transaction: TransactionEntity,
    jettonAmount: bigint,
    error?: string,
  ): Promise<void> {
    this.logger.error(`[DEBUG] Handling burn failure for transaction ${transaction.lt}: ${error}`);
    this.logger.debug(`[DEBUG] Jetton amount that failed to burn: ${jettonAmount}`);
    
    try {
      // Check relayer balance before attempting refund
      const relayerBalance = await this.tonService.getWalletBalance();
      this.logger.debug(`[DEBUG] Relayer balance before refund: ${relayerBalance} nanotons`);
      
      if (relayerBalance < BigInt(transaction.amountNanotons) + BigInt(this.config.gasForCallback)) {
        this.logger.error(`[DEBUG] Insufficient relayer balance for refund: ${relayerBalance} < ${BigInt(transaction.amountNanotons) + BigInt(this.config.gasForCallback)}`);
        
        // Mark as failed if insufficient balance for refund
        transaction.status = TransactionStatus.FAILED;
        transaction.errorMessage = `Burn failed: ${error}. Insufficient balance for refund: ${relayerBalance}`;
        transaction.processedAt = new Date();
        await this.transactionRepository.save(transaction);
        
        this.monitoringService.logError(
          new Error(`Insufficient balance for refund: ${relayerBalance}`),
          "handleBurnFailure",
          transaction.lt,
        );
        return;
      }

      // Send refund
      this.logger.log(`[DEBUG] Sending refund to user ${transaction.userAddress}: ${transaction.amountNanotons} nanotons`);
      await this.tonService.sendRefundUser(
        transaction.userAddress,
        BigInt(transaction.amountNanotons),
      );

      // Update transaction status
      transaction.status = TransactionStatus.REFUNDED;
      transaction.errorMessage = error || "Burn failed";
      transaction.processedAt = new Date();
      await this.transactionRepository.save(transaction);

      this.logger.log(`[DEBUG] Refund sent successfully for transaction ${transaction.lt}`);
      this.monitoringService.logTransactionComplete(transaction.lt, false);
    } catch (refundError) {
      this.logger.error(`[DEBUG] Refund failed for transaction ${transaction.lt}: ${refundError.message}`);
      this.logger.error(`[DEBUG] Refund error details:`, refundError);
      
      this.monitoringService.logError(
        refundError,
        "handleBurnFailure",
        transaction.lt,
      );

      // Mark as failed if refund also failed
      transaction.status = TransactionStatus.FAILED;
      transaction.errorMessage = `Burn failed: ${error}. Refund failed: ${refundError.message}`;
      transaction.processedAt = new Date();
      await this.transactionRepository.save(transaction);
      
      // Log for manual intervention
      this.logger.error(`[DEBUG] CRITICAL: Transaction ${transaction.lt} requires manual intervention - both burn and refund failed`);
    }
  }

  /**
   * Check wallet balance and log warnings
   */
  private async checkWalletBalance(): Promise<void> {
    try {
      const balance = await this.tonService.getWalletBalance();
      this.metricsService.updateWalletBalance(balance);

      const minBalance = BigInt(this.config.gasForCallback) * 100n;
      this.monitoringService.logBalanceCheck(balance, minBalance);
    } catch (error) {
      this.monitoringService.logError(error, "checkWalletBalance");
    }
  }

  /**
   * Health check endpoint
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    metrics: any;
    issues: string[];
  }> {
    const healthCheck = this.metricsService.checkHealth();
    const metrics = this.metricsService.getMetrics();

    return {
      healthy: healthCheck.healthy,
      metrics,
      issues: healthCheck.issues,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    limit: number = 100,
  ): Promise<TransactionEntity[]> {
    return this.transactionRepository.find({
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Process subscription from backend
   */
  async processSubscription(data: {
    userAddress: string;
    phoneNumber: string;
    amount: string;
    txHash: string;
    subscriptionContractAddress: string;
  }) {
    this.logger.log(
      `Processing subscription: ${data.userAddress}, amount: ${data.amount}`,
    );

    try {
      // Create transaction record
      this.logger.log(`📊 Creating transaction record for ${data.userAddress}`);
      this.logger.log(`📊 Transaction data:`, {
        userAddress: data.userAddress,
        amount: data.amount,
        txHash: data.txHash.substring(0, 50) + '...', // Log only first 50 chars
        subscriptionContractAddress: data.subscriptionContractAddress,
      });
      
      const transaction = this.transactionRepository.create({
        lt: Date.now().toString(),
        hash: data.txHash,
        userAddress: data.userAddress,
        fromAddress: data.subscriptionContractAddress,
        toAddress: this.config.relayerWalletAddress,
        amountNanotons: (parseFloat(data.amount) * 1_000_000_000).toString(),
        amount: data.amount,
        txHash: data.txHash,
        status: TransactionStatus.PENDING,
        type: "subscription",
      });

      await this.transactionRepository.save(transaction);
      this.logger.log(`✅ Transaction record created successfully: ${transaction.id}`);

      // Process the subscription (swap + burn)
      const swapResult = await this.swapService.performSwap(
        BigInt(parseFloat(data.amount) * 1_000_000_000), // Convert to nanotons
        data.userAddress,
        transaction.id.toString(),
      );

      if (swapResult.success) {
        // Burn the jettons
        const burnResult = await this.burnService.burnJetton(
          swapResult.jettonAmount,
          data.userAddress,
          transaction.id.toString(),
        );

        if (burnResult.success) {
          // Update transaction status
          transaction.status = TransactionStatus.COMPLETED;
          await this.transactionRepository.save(transaction);

          // Send OnSwapCallback to contract to activate subscription
          this.logger.log(`🔄 Sending OnSwapCallback to contract for user: ${data.userAddress}`);
          try {
            await this.tonService.sendOnSwapCallback(
              data.userAddress,
              swapResult.jettonAmount,
              true // success
            );
            this.logger.log(`✅ OnSwapCallback sent successfully to contract`);
          } catch (callbackError) {
            this.logger.error(`❌ Failed to send OnSwapCallback to contract: ${callbackError.message}`);
            // Don't throw error - subscription is still processed in backend
          }

          // Notify backend about success
          await this.backendNotificationService.notifySwapResult({
            userAddress: data.userAddress,
            phoneNumber: data.phoneNumber,
            success: true,
            txId: transaction.id.toString(),
            jettonAmount: swapResult.jettonAmount.toString(),
          });

          this.logger.log(
            `Subscription processed successfully: ${data.userAddress}`,
          );
          return {
            success: true,
            txId: transaction.id.toString(),
            message: "Subscription processed successfully",
          };
        } else {
          // Burn failed, send refund
          await this.tonService.sendRefundUser(
            data.userAddress,
            BigInt(parseFloat(data.amount) * 1_000_000_000),
          );

          transaction.status = TransactionStatus.FAILED;
          await this.transactionRepository.save(transaction);

          await this.backendNotificationService.notifySwapResult({
            userAddress: data.userAddress,
            phoneNumber: data.phoneNumber,
            success: false,
            txId: transaction.id.toString(),
            error: "Burn failed, refund sent",
          });

          return {
            success: false,
            txId: transaction.id.toString(),
            message: "Burn failed, refund sent",
          };
        }
      } else {
        // Swap failed, send refund
        await this.tonService.sendRefundUser(
          data.userAddress,
          BigInt(parseFloat(data.amount) * 1_000_000_000),
        );

        transaction.status = TransactionStatus.FAILED;
        await this.transactionRepository.save(transaction);

        await this.backendNotificationService.notifySwapResult({
          userAddress: data.userAddress,
          phoneNumber: data.phoneNumber,
          success: false,
          txId: transaction.id.toString(),
          error: "Swap failed, refund sent",
        });

        return {
          success: false,
          txId: transaction.id.toString(),
          message: "Swap failed, refund sent",
        };
      }
    } catch (error) {
      this.logger.error(`❌ Failed to process subscription: ${error.message}`);
      this.logger.error(`🔍 Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Check if it's a database field length error
      if (error.message.includes('value too long for type character varying')) {
        this.logger.error(`🚨 Database field length error detected!`);
        this.logger.error(`🚨 This means the database schema needs to be updated.`);
        this.logger.error(`🚨 NOT sending refund - this is a database configuration issue.`);
        
        return {
          success: false,
          txId: "",
          message: "Database configuration error - field length too short",
        };
      }

      // Send refund on other errors
      this.logger.log(`🔄 Sending refund due to error: ${data.userAddress}`);
      try {
        await this.tonService.sendRefundUser(
          data.userAddress,
          BigInt(parseFloat(data.amount) * 1_000_000_000),
        );
        this.logger.log(`✅ Refund sent successfully`);
      } catch (refundError) {
        this.logger.error(`❌ Failed to send refund: ${refundError.message}`);
      }

      return {
        success: false,
        txId: "",
        message: error.message,
      };
    }
  }

  // ✅ УБРАНО: startProcessingLoop - больше не нужен, так как нет автоматического сканирования
}
