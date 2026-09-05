import "dotenv/config";
import { PrismaClient } from "../generated/prisma-cloud";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { cbdCloudPrisma: PrismaClient | null | undefined };

function createClient(): PrismaClient | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[@cbd/database] DATABASE_URL is not set — cloud client disabled, falling back where callers support it.");
    return null;
  }
  try {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (err) {
    console.warn("[@cbd/database] Failed to initialize cloud Prisma client:", err);
    return null;
  }
}

const cloudClient = globalForPrisma.cbdCloudPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.cbdCloudPrisma = cloudClient;

/** Dùng bởi apps/dashboard (đọc/ghi) và apps/landing (chỉ đọc). Trả về `null`
 * nếu DATABASE_URL chưa cấu hình — mọi call site phải tự xử lý fallback. */
export function getCloudClient(): PrismaClient | null {
  return cloudClient;
}

export type { PrismaClient as CloudPrismaClient } from "../generated/prisma-cloud";
