import "dotenv/config";
import { defineConfig } from "prisma/config";

// Cấu hình này chỉ áp dụng cho schema CLOUD (schema.cloud.prisma) — schema
// LOCAL (SQLite) tự khai báo `url = env("LOCAL_DATABASE_URL")` ngay trong
// datasource block nên không cần override ở đây.
export default defineConfig({
  schema: "prisma/schema.cloud.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI (db push / migrate / studio) cần kết nối trực tiếp, không qua
    // pool. App thật kết nối riêng qua @prisma/adapter-neon dùng DATABASE_URL
    // (pooled) — xem src/cloud-client.ts.
    url: process.env.DIRECT_URL ?? "",
  },
});
