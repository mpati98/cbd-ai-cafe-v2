import "dotenv/config";
import { defineConfig } from "prisma/config";

// Config CLI riêng cho schema LOCAL (SQLite) — dùng qua `--config
// prisma.config.local.ts` (xem package.json scripts: generate:local,
// db:push:local, db:studio:local). Runtime thật dùng
// @prisma/adapter-better-sqlite3 trực tiếp (src/local-client.ts), không qua
// file config này.
export default defineConfig({
  schema: "prisma/schema.local.prisma",
  migrations: {
    path: "prisma/migrations-local",
  },
  datasource: {
    url: process.env.LOCAL_DATABASE_URL ?? "file:./prisma/pos-local-dev.db",
  },
});
