import { Injectable } from "@nestjs/common";
import { HealthStatus } from "../domain/health-status";

const HEALTH_SERVICE_NAME = "nangman-infra-meet-backend";

@Injectable()
export class GetHealthUseCase {
  execute(): HealthStatus {
    return {
      service: HEALTH_SERVICE_NAME,
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
