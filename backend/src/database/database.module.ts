import { Inject, Injectable, Module, OnApplicationShutdown } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { appConfig } from "../config/app.config";
import {
  assertTestRuntimeUsesInMemoryPersistence,
  shouldUseInMemoryPersistence,
} from "../common/test-safety/test-write-protection";
import * as schema from "./schema";

export const DATABASE_POOL = Symbol("DATABASE_POOL");
export const DATABASE = Symbol("DATABASE");

export type AppDatabase = NodePgDatabase<typeof schema>;

@Injectable()
class DatabasePoolCleanup implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool | null) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool?.end();
  }
}

@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>): Pool | null => {
        assertTestRuntimeUsesInMemoryPersistence(config);

        if (shouldUseInMemoryPersistence(config)) {
          return null;
        }

        if (config.database.url) {
          return new Pool({
            connectionString: config.database.url,
            idleTimeoutMillis: config.database.idleTimeoutMs,
            max: config.database.poolMax,
          });
        }

        throw new Error(
          "DATABASE_URL must be set unless ALLOW_IN_MEMORY_PERSISTENCE=true.",
        );
      },
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool | null): AppDatabase | null => {
        if (!pool) {
          return null;
        }

        return drizzle(pool, { schema });
      },
    },
    DatabasePoolCleanup,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
