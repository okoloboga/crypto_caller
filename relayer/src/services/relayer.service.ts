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

  // ✅ УБРАНО: processTransactions - больше не нужен, так как нет автоматического сканирования

  // ✅ УБРАНО: processTransaction - больше не нужен, так как нет автоматического сканирования
  // Вся логика swap, burn и ton остается в processSubscription

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
    amount: string;
    txHash: string;
    subscriptionContractAddress: string;
  }) {
    this.logger.log(
      `Processing subscription: ${data.userAddress}, amount: ${data.amount}`,
    );

    try {
      // Create transaction record
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

          // Notify backend about success
          await this.backendNotificationService.notifySwapResult({
            userAddress: data.userAddress,
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
      this.logger.error(`Failed to process subscription: ${error.message}`);

      // Send refund on error
      try {
        await this.tonService.sendRefundUser(
          data.userAddress,
          BigInt(parseFloat(data.amount) * 1_000_000_000),
        );
      } catch (refundError) {
        this.logger.error(`Failed to send refund: ${refundError.message}`);
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
