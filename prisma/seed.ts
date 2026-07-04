import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
  fallbackHeroSlides,
  fallbackMenuItems,
  fallbackRoadmapItems,
  fallbackBranches,
} from "../src/lib/fallback-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill in your Neon connection strings.");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedAdminUser() {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.log(`Bỏ qua tạo tài khoản ADMIN (đã có ${existingCount} user trong hệ thống).`);
    return;
  }

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@cbdaicafe.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "change-me-please";
  const name = process.env.SEED_ADMIN_NAME || "Chủ quán";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, passwordHash, role: "ADMIN", permissions: [] },
  });

  console.log("Đã tạo tài khoản ADMIN đầu tiên:");
  console.log(`  - Email: ${email}`);
  console.log(`  - Mật khẩu: ${password === "change-me-please" ? "(mặc định — đổi ngay!) change-me-please" : "(theo SEED_ADMIN_PASSWORD trong .env)"}`);
  console.log("  Đăng nhập ở /admin rồi đổi mật khẩu trong tab Người dùng.");
}

async function main() {
  console.log("Seeding CBD AI Cafe content into Neon...");

  await prisma.heroSlide.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.roadmapItem.deleteMany();
  await prisma.branch.deleteMany();

  await prisma.heroSlide.createMany({
    data: fallbackHeroSlides.map(({ id, ...rest }) => rest),
  });

  await prisma.menuItem.createMany({
    data: fallbackMenuItems.map(({ id, ...rest }) => rest),
  });

  await prisma.roadmapItem.createMany({
    data: fallbackRoadmapItems.map(({ id, ...rest }) => rest),
  });

  await prisma.branch.createMany({
    data: fallbackBranches.map(({ id, ...rest }) => rest),
  });

  await seedAdminUser();

  console.log("Done. Seeded:");
  console.log(`  - ${fallbackHeroSlides.length} hero slides`);
  console.log(`  - ${fallbackMenuItems.length} menu items`);
  console.log(`  - ${fallbackRoadmapItems.length} roadmap items`);
  console.log(`  - ${fallbackBranches.length} branches`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
