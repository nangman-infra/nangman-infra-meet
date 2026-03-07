import { Controller, Get } from "@nestjs/common";
import { GetHealthUseCase } from "../../application/get-health.use-case";
import { HealthStatus } from "../../domain/health-status";

@Controller("internal/health")
export class InternalHealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  @Get()
  getHealth(): HealthStatus {
    return this.getHealthUseCase.execute();
  }
}

@Controller("health")
export class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  @Get()
  getVersionedHealth(): HealthStatus {
    return this.getHealthUseCase.execute();
  }
}
