import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

export interface BackendNotificationRequest {
  userAddress: string;
  success: boolean;
  txId: string;
  jettonAmount?: string;
  error?: string;
}

@Injectable()
export class BackendNotificationService {
  private readonly logger = new Logger(BackendNotificationService.name);
  private readonly backendUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.backendUrl = process.env.BACKEND_URL || "http://backend:3000";
  }

  /**
   * Notify backend about swap result
   */
  async notifySwapResult(data: BackendNotificationRequest): Promise<void> {
    try {
      this.logger.log(
        `Sending swap result to backend: ${JSON.stringify(data)}`,
      );

      await firstValueFrom(
        this.httpService.post(
          `${this.backendUrl}/api/relayer/swap-result`,
          data,
        ),
      );

      this.logger.log(`Backend notification sent successfully`);
    } catch (error) {
      this.logger.error(`Failed to notify backend: ${error.message}`);
      // Don't throw - this is not critical for the main flow
    }
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.backendUrl}/api/health`),
      );
      return (response as any).status === 200;
    } catch (error) {
      this.logger.error(`Backend health check failed: ${error.message}`);
      return false;
    }
  }
}
