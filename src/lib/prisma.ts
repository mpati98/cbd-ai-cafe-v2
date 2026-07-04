import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prevent creating a new PrismaClient (and a new connection pool) on every
// hot-reload in dev, and reuse a single instance in serverless (Neon-friendly).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined;
};

function createClient(): PrismaClient | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn(
      "[CBD AI Cafe] DATABASE_URL is not set — falling back to static content. " +
        "See .env.example / README to connect Neon."
    );
    return null;
  }
  try {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (err) {
    // Client not generated yet ("prisma generate"), bad connection string, etc.
    // content.ts falls back to static data in this case, so we don't crash the app.
    console.warn(
      "[CBD AI Cafe] Prisma Client failed to initialize — falling back to static content.",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
