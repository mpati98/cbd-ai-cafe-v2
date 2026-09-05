import "dotenv/config";
import { PrismaClient } from "../generated/prisma-local";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { cbdLocalPrisma: PrismaClient | null | undefined };

function createClient(): PrismaClient | null {
  const rawUrl = process.env.LOCAL_DATABASE_URL;
  if (!rawUrl) {
    console.warn("[@cbd/database] LOCAL_DATABASE_URL is not set — local client disabled.");
    return null;
  }
  // better-sqlite3 nhận đường dẫn file thô hoặc ":memory:" — bỏ tiền tố
  // "file:" nếu có (giữ tiền tố này trong .env để đúng convention Prisma CLI
  // dùng lúc migrate/db push, xem prisma.config.local.ts).
  const url = rawUrl === ":memory:" ? rawUrl : rawUrl.replace(/^file:/, "");
  try {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (err) {
    console.warn("[@cbd/database] Failed to initialize local Prisma client:", err);
    return null;
  }
}

const localClient = globalForPrisma.cbdLocalPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.cbdLocalPrisma = localClient;

/** Dùng bởi apps/pos-local — SQLite tại quán. Trả về `null` nếu
 * LOCAL_DATABASE_URL chưa cấu hình (không nên xảy ra trong Docker image thật
 * — biến này luôn được set qua .env của container). */
export function getLocalClient(): PrismaClient | null {
  return localClient;
}

export type { PrismaClient as LocalPrismaClient } from "../generated/prisma-local";
