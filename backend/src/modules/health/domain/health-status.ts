export interface HealthStatus {
  readonly service: string;
  readonly status: "ok";
  readonly timestamp: string;
}
