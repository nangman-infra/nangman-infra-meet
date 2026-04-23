import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

const MIGRATIONS_DIRECTORY = join(process.cwd(), "drizzle");
const MIGRATION_STATEMENT_SEPARATOR = /--> statement-breakpoint/g;
const MIGRATION_LOCK_KEY_1 = 840_878_787;
const MIGRATION_LOCK_KEY_2 = 2_026_042_3;

export async function runPendingMigrations(): Promise<void> {
  config({ path: ".env", quiet: true });
  config({ path: ".env.local", override: true, quiet: true });

  const connectionString = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

  if (!connectionString || shouldUseInMemoryPersistence()) {
    return;
  }

  const client = new Client({ connectionString });

  await client.connect();

  try {
    await client.query(
      "SELECT pg_advisory_lock($1, $2)",
      [MIGRATION_LOCK_KEY_1, MIGRATION_LOCK_KEY_2],
    );
    await ensureMigrationTable(client);

    const migrationFiles = await listMigrationFiles();

    for (const migrationFile of migrationFiles) {
      await applyMigrationIfPending(client, migrationFile);
    }
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock($1, $2)",
      [MIGRATION_LOCK_KEY_1, MIGRATION_LOCK_KEY_2],
    );
    await client.end();
  }
}

function shouldUseInMemoryPersistence(): boolean {
  return process.env.ALLOW_IN_MEMORY_PERSISTENCE?.trim().toLowerCase() === "true";
}

async function ensureMigrationTable(client: Client): Promise<void> {
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIRECTORY);

  return entries
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .map((entry) => join(MIGRATIONS_DIRECTORY, entry));
}

async function applyMigrationIfPending(
  client: Client,
  migrationFile: string,
): Promise<void> {
  const migrationSql = await readFile(migrationFile, "utf8");
  const migrationHash = createHash("sha256").update(migrationSql).digest("hex");
  const existingMigration = await client.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1)",
    [migrationHash],
  );

  if (existingMigration.rows[0]?.exists) {
    return;
  }

  const statements = migrationSql
    .split(MIGRATION_STATEMENT_SEPARATOR)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  await client.query("BEGIN");

  try {
    for (const statement of statements) {
      await client.query(statement);
    }

    await client.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [migrationHash, Date.now()],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
