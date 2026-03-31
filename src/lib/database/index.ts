import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

// Database connection configuration
const createDatabaseConnection = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        // Connection pool options
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      }),
    }),
  });
};

const globalForDb = global as unknown as { db: Kysely<Database> | undefined };

export const db = globalForDb.db ?? createDatabaseConnection();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

// Export the type for use in other files
export type DB = typeof db;

// Export database queries and utilities
export * from "./queries";
export * from "./subscription-queries";
export * from "./types";
