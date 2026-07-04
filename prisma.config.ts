import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI (db push / migrate / studio) needs a direct, unpooled connection.
    // The app itself connects separately via @prisma/adapter-neon using DATABASE_URL
    // (the pooled connection) — see src/lib/prisma.ts.
    // Plain process.env (not the `env()` helper) so `prisma generate` still works
    // before .env is configured — db push/migrate will simply fail with a clear
    // connection error until DIRECT_URL is set.
    url: process.env.DIRECT_URL ?? "",
  },
});
