import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RelayerConfig } from "../../config/relayer.config";

export interface RelayerMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalJettonsBurned: bigint;
  totalTonSwapped: bigint;
  averageProcessingTime: number;
  lastProcessedAt: Date | null;
  walletBalance: bigint;
  uptime: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly config: RelayerConfig;
  private readonly startTime = Date.now();

  private metrics: RelayerMetrics = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalJettonsBurned: 0n,
    totalTonSwapped: 0n,
    averageProcessingTime: 0,
    lastProcessedAt: null,
    walletBalance: 0n,
    uptime: 0,
  };

  constructor(private configService: ConfigService) {
    this.config = this.configService.get<RelayerConfig>("relayer");
  }

  /**
   * Record transaction processing
   */
  recordTransaction(
    success: boolean,
    jettonAmount: bigint,
    tonAmount: bigint,
    processingTime: number,
  ): void {
    this.metrics.totalTransactions++;

    if (success) {
      this.metrics.successfulTransactions++;
      this.metrics.totalJettonsBurned += jettonAmount;
      this.metrics.totalTonSwapped += tonAmount;
    } else {
      this.metrics.failedTransactions++;
    }

    // Update average processing time
    this.updateAverageProcessingTime(processingTime);

    this.metrics.lastProcessedAt = new Date();

    this.logger.debug(
      `Metrics updated: total=${this.metrics.totalTransactions}, success=${this.metrics.successfulTransactions}, failed=${this.metrics.failedTransactions}`,
    );
  }

  /**
   * Update wallet balance
   */
  updateWalletBalance(balance: bigint): void {
    this.metrics.walletBalance = balance;
  }

  /**
   * Get current metrics
   */
  getMetrics(): RelayerMetrics {
    this.metrics.uptime = Date.now() - this.startTime;
    return { ...this.metrics };
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.totalTransactions === 0) {
      return 0;
    }
    return (
      (this.metrics.successfulTransactions / this.metrics.totalTransactions) *
      100
    );
  }

  /**
   * Get failure rate
   */
  getFailureRate(): number {
    if (this.metrics.totalTransactions === 0) {
      return 0;
    }
    return (
      (this.metrics.failedTransactions / this.metrics.totalTransactions) * 100
    );
  }

  /**
   * Check if metrics indicate health issues
   */
  checkHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check success rate
    const successRate = this.getSuccessRate();
    if (successRate < 80 && this.metrics.totalTransactions > 10) {
      issues.push(`Low success rate: ${successRate.toFixed(2)}%`);
    }

    // Check wallet balance
    const minBalance = BigInt(this.config.gasForCallback) * 100n; // 100x gas for safety
    if (this.metrics.walletBalance < minBalance) {
      issues.push(`Low wallet balance: ${this.metrics.walletBalance} nanotons`);
    }

    // Check if no transactions processed recently
    if (this.metrics.lastProcessedAt) {
      const timeSinceLastProcessed =
        Date.now() - this.metrics.lastProcessedAt.getTime();
      const maxIdleTime = 5 * 60 * 1000; // 5 minutes
      if (timeSinceLastProcessed > maxIdleTime) {
        issues.push(
          `No transactions processed for ${Math.round(timeSinceLastProcessed / 1000)}s`,
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalJettonsBurned: 0n,
      totalTonSwapped: 0n,
      averageProcessingTime: 0,
      lastProcessedAt: null,
      walletBalance: 0n,
      uptime: 0,
    };
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    if (this.metrics.totalTransactions === 1) {
      this.metrics.averageProcessingTime = processingTime;
    } else {
      // Calculate rolling average
      const alpha = 0.1; // Smoothing factor
      this.metrics.averageProcessingTime =
        alpha * processingTime +
        (1 - alpha) * this.metrics.averageProcessingTime;
    }
  }
}
