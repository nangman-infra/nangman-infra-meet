import {
  type INestApplication,
  RequestMethod,
  ValidationPipe,
} from "@nestjs/common";
import helmet from "helmet";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppConfig } from "../config/app.config";

const DEFAULT_API_VERSION_SEGMENT = "v1";

export function configureApp(app: INestApplication, config: AppConfig): void {
  const versionedApiPrefix = `${config.apiPrefix}/${DEFAULT_API_VERSION_SEGMENT}`;

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.use(helmet());
  app.enableCors({
    origin: createCorsOriginMatcher(config.corsOrigins),
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.setGlobalPrefix(versionedApiPrefix, {
    exclude: [{ path: "internal/health", method: RequestMethod.GET }],
  });
}

function createCorsOriginMatcher(allowedOrigins: string[]) {
  if (allowedOrigins.length === 0) {
    return false;
  }

  if (allowedOrigins.includes("*")) {
    return true;
  }

  const allowedOriginsSet = new Set(allowedOrigins);

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, allowedOriginsSet.has(origin));
  };
}
