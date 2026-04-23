import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppConfig, appConfig } from "./config/app.config";
import { configureApp } from "./bootstrap/configure-app";
import { runPendingMigrations } from "./database/run-pending-migrations";

async function bootstrap(): Promise<void> {
  await runPendingMigrations();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(appConfig.KEY) as AppConfig;
  configureApp(app, config);

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
