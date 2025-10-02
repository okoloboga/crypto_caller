import { Module } from "@nestjs/common";
import { MonitoringService } from "./monitoring.service";
import { MetricsService } from "./metrics.service";

@Module({
  providers: [MonitoringService, MetricsService],
  exports: [MonitoringService, MetricsService],
})
export class MonitoringModule {}
