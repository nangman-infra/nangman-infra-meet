import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigType } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { WinstonModule } from "nest-winston";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ApiResponseInterceptor } from "./common/interceptors/api-response.interceptor";
import { LoggingModule } from "./common/logging/logging.module";
import { RequestLoggingInterceptor } from "./common/logging/request-logging.interceptor";
import { createWinstonLoggerOptions } from "./common/logging/winston.config";
import { appConfig } from "./config/app.config";
import { ENV_VALIDATION_SCHEMA } from "./config/env.validation";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { HealthModule } from "./modules/health/health.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { ModerationModule } from "./modules/moderation/moderation.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env", ".env.local"],
      expandVariables: true,
      load: [appConfig],
      validationSchema: ENV_VALIDATION_SCHEMA,
    }),
    ThrottlerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => [
        {
          ttl: config.rateLimit.ttlMs,
          limit: config.rateLimit.limit,
        },
      ],
    }),
    WinstonModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) =>
        createWinstonLoggerOptions(config.logLevel, config.nodeEnv),
    }),
    LoggingModule,
    AttendanceModule,
    HealthModule,
    MeetingsModule,
    ModerationModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
