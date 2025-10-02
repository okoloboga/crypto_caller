import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RelayerConfig } from "../../config/relayer.config";

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly config: RelayerConfig;

  constructor(private configService: ConfigService) {
    this.config = this.configService.get<RelayerConfig>("relayer");
  }

  /**
   * Log transaction processing start
   */
  logTransactionStart(txId: string, userAddress: string, amount: bigint): void {
    this.logger.log(
      `Processing transaction: ${txId} for user ${userAddress}, amount: ${amount} nanotons`,
    );
  }

  /**
   * Log transaction processing completion
   */
  logTransactionComplete(
    txId: string,
    success: boolean,
    jettonAmount?: bigint,
  ): void {
    if (success) {
      this.logger.log(
        `Transaction completed successfully: ${txId}, burned: ${jettonAmount} jettons`,
      );
    } else {
      this.logger.warn(`Transaction failed: ${txId}`);
    }
  }

  /**
   * Log swap operation
   */
  logSwap(
    txId: string,
    tonAmount: bigint,
    jettonAmount: bigint,
    success: boolean,
  ): void {
    if (success) {
      this.logger.log(
        `Swap successful: ${txId}, ${tonAmount} TON -> ${jettonAmount} jettons`,
      );
    } else {
      this.logger.error(`Swap failed: ${txId}, ${tonAmount} TON`);
    }
  }

  /**
   * Log burn operation
   */
  logBurn(txId: string, jettonAmount: bigint, success: boolean): void {
    if (success) {
      this.logger.log(
        `Burn successful: ${txId}, burned ${jettonAmount} jettons`,
      );
    } else {
      this.logger.error(`Burn failed: ${txId}, ${jettonAmount} jettons`);
    }
  }

  /**
   * Log error with context
   */
  logError(error: Error, context: string, txId?: string): void {
    this.logger.error(
      `Error in ${context}${txId ? ` (tx: ${txId})` : ""}: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Log warning with context
   */
  logWarning(message: string, context: string, txId?: string): void {
    this.logger.warn(
      `Warning in ${context}${txId ? ` (tx: ${txId})` : ""}: ${message}`,
    );
  }

  /**
   * Log system health check
   */
  logHealthCheck(
    component: string,
    status: "healthy" | "unhealthy",
    details?: string,
  ): void {
    if (status === "healthy") {
      this.logger.log(
        `Health check passed: ${component}${details ? ` - ${details}` : ""}`,
      );
    } else {
      this.logger.error(
        `Health check failed: ${component}${details ? ` - ${details}` : ""}`,
      );
    }
  }

  /**
   * Log balance check
   */
  logBalanceCheck(balance: bigint, threshold: bigint): void {
    if (balance < threshold) {
      this.logger.warn(
        `Low balance warning: ${balance} nanotons (threshold: ${threshold})`,
      );
    } else {
      this.logger.log(`Balance check passed: ${balance} nanotons`);
    }
  }

  /**
   * Log retry attempt
   */
  logRetry(
    txId: string,
    attempt: number,
    maxRetries: number,
    error?: string,
  ): void {
    this.logger.warn(
      `Retry attempt ${attempt}/${maxRetries} for transaction ${txId}${error ? ` - ${error}` : ""}`,
    );
  }

  /**
   * Log rate limiting
   */
  logRateLimit(component: string, delay: number): void {
    this.logger.debug(`Rate limiting ${component}: ${delay}ms delay`);
  }
}
