import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("RelayerBootstrap");

  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Relayer service is running on port ${port}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start relayer service:", error);
  process.exit(1);
});
