import { Module } from "@nestjs/common";
import { GetHealthUseCase } from "./application/get-health.use-case";
import {
  HealthController,
  InternalHealthController,
} from "./presentation/http/health.controller";

@Module({
  controllers: [HealthController, InternalHealthController],
  providers: [GetHealthUseCase],
})
export class HealthModule {}
