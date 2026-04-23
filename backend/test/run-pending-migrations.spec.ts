const mockConfig = jest.fn();
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();
const mockQuery = jest.fn();
const mockClientConstructor = jest.fn(() => ({
  connect: mockConnect,
  end: mockEnd,
  query: mockQuery,
}));

jest.mock("dotenv", () => ({
  config: mockConfig,
}));

jest.mock("node:fs/promises", () => ({
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

jest.mock("pg", () => ({
  Client: mockClientConstructor,
}));

import { createHash } from "node:crypto";
import { runPendingMigrations } from "../src/database/run-pending-migrations";

describe("runPendingMigrations", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDatabaseUrlDirect = process.env.DATABASE_URL_DIRECT;
  const originalAllowInMemoryPersistence =
    process.env.ALLOW_IN_MEMORY_PERSISTENCE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://app:secret@localhost:5432/app";
    process.env.DATABASE_URL_DIRECT = "";
    process.env.ALLOW_IN_MEMORY_PERSISTENCE = "";
    mockConnect.mockResolvedValue(undefined);
    mockEnd.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(["0001_second.sql", "0000_first.sql"]);
    mockReadFile.mockResolvedValue(
      [
        "CREATE TABLE meetings (id uuid PRIMARY KEY);",
        "INSERT INTO meetings (id) VALUES ('00000000-0000-0000-0000-000000000000');",
      ].join("--> statement-breakpoint"),
    );
    mockQuery.mockResolvedValue({ rows: [] });
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.DATABASE_URL_DIRECT = originalDatabaseUrlDirect;
    process.env.ALLOW_IN_MEMORY_PERSISTENCE = originalAllowInMemoryPersistence;
  });

  it("skips database work when persistent storage is disabled", async () => {
    process.env.DATABASE_URL = "";
    process.env.DATABASE_URL_DIRECT = "";
    process.env.ALLOW_IN_MEMORY_PERSISTENCE = "true";

    await runPendingMigrations();

    expect(mockClientConstructor).not.toHaveBeenCalled();
    expect(mockReaddir).not.toHaveBeenCalled();
  });

  it("applies pending migrations in filename order and records their hashes", async () => {
    const migrationSql = [
      "CREATE TABLE meetings (id uuid PRIMARY KEY);",
      "CREATE INDEX meetings_id_idx ON meetings (id);",
    ].join("--> statement-breakpoint");
    const migrationHash = createHash("sha256").update(migrationSql).digest("hex");

    mockReadFile.mockResolvedValue(migrationSql);
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT EXISTS")) {
        return { rows: [{ exists: false }] };
      }

      return { rows: [] };
    });

    await runPendingMigrations();

    expect(mockClientConstructor).toHaveBeenCalledWith({
      connectionString: "postgresql://app:secret@localhost:5432/app",
    });
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockReadFile.mock.calls.map(([file]) => file)).toEqual([
      expect.stringContaining("0000_first.sql"),
      expect.stringContaining("0001_second.sql"),
    ]);
    expect(mockQuery).toHaveBeenCalledWith(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [migrationHash, expect.any(Number)],
    );
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT pg_advisory_unlock($1, $2)",
      [840878787, 20260423],
    );
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it("skips migrations whose hash is already recorded", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT EXISTS")) {
        return { rows: [{ exists: true }] };
      }

      return { rows: [] };
    });

    await runPendingMigrations();

    expect(mockQuery).not.toHaveBeenCalledWith("BEGIN");
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE meetings"),
    );
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it("rolls back the current migration and releases the lock when a statement fails", async () => {
    const migrationError = new Error("migration failed");

    mockReaddir.mockResolvedValue(["0000_first.sql"]);
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT EXISTS")) {
        return { rows: [{ exists: false }] };
      }

      if (sql.includes("CREATE TABLE meetings")) {
        throw migrationError;
      }

      return { rows: [] };
    });

    await expect(runPendingMigrations()).rejects.toThrow("migration failed");

    expect(mockQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT pg_advisory_unlock($1, $2)",
      [840878787, 20260423],
    );
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
