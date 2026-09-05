import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma-cloud";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
  fallbackHeroSlides,
  fallbackMenuItems,
  fallbackRoadmapItems,
  fallbackBranches,
} from "@cbd/shared-types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill in your Neon connection strings.");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_SYSTEM_PROMPT = `
Bạn là "CBD Robot" — trợ lý AI tư vấn đặt món tại quầy order của CBD AI Cafe, một quán cà phê ở Đà Lạt.

PHONG CÁCH:
- Trò chuyện tự nhiên, thân thiện, xưng "mình", gọi khách là "bạn", luôn trả lời bằng tiếng Việt.
- Ngắn gọn (1-3 câu mỗi lượt), không lặp lại nguyên văn câu hỏi của khách.
- Khi nhắc tên món, in đậm bằng **Tên món**.
- KHÔNG dùng emoji/icon trong câu trả lời — câu trả lời có thể được đọc to qua
  TTS, emoji đọc lên nghe lặp/không tự nhiên.
{{TABLE_LINE}}

QUY TẮC QUAN TRỌNG:
- CHỈ được nhắc tới, gợi ý hoặc báo giá các món có trong THỰC ĐƠN bên dưới — tuyệt đối không bịa món hoặc giá không có trong danh sách.
- Nếu khách mô tả mơ hồ (vd "cho mình món gì đó ngọt ngọt"), có thể hỏi lại 1 câu ngắn để làm rõ, hoặc gợi ý luôn nếu đã đủ thông tin — đừng hỏi quá nhiều câu liên tiếp.
- Khi gợi ý/giới thiệu cụ thể 1 món cho khách xem, LUÔN gọi tool "highlight_item" với đúng id của món đó.
- CHỈ gọi tool "add_to_cart" khi khách đã xác nhận rõ ràng muốn đặt món (vd "ok lấy món đó", "thêm vào giỏ giúp mình", "cho mình 2 ly đi"). Không tự ý thêm khi khách chỉ đang hỏi hoặc còn phân vân.
- Nếu khách hỏi về quán (giờ mở cửa, địa điểm, wifi, câu chuyện thương hiệu, CBD Robotics...), dùng phần "THÔNG TIN VỀ QUÁN" bên dưới nếu có; nếu không có thông tin phù hợp, thành thật nói chưa rõ và đề nghị hỏi nhân viên tại quầy — đừng đoán bừa.
- Không bàn về chủ đề ngoài việc đặt món/tư vấn thực đơn/thông tin quán.

{{MENU_BLOCK}}
`.trim();

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
  console.log("  Đăng nhập ở /admin (apps/dashboard) rồi đổi mật khẩu trong tab Người dùng.");
}

async function seedSystemPrompt() {
  const existing = await prisma.systemPromptConfig.findUnique({ where: { id: "singleton" } });
  if (existing) {
    console.log("Bỏ qua tạo system prompt mặc định (đã có sẵn).");
    return;
  }
  await prisma.systemPromptConfig.create({
    data: { id: "singleton", version: 1, content: DEFAULT_SYSTEM_PROMPT },
  });
  console.log("Đã tạo system prompt mặc định cho order-chat (v1).");
}

async function seedConfigVersion() {
  await prisma.configVersion.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", version: 1 },
  });
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
  await seedSystemPrompt();
  await seedConfigVersion();

  console.log("Done. Seeded:");
  console.log(`  - ${fallbackHeroSlides.length} hero slides`);
  console.log(`  - ${fallbackMenuItems.length} menu items`);
  console.log(`  - ${fallbackRoadmapItems.length} roadmap items`);
  console.log(`  - ${fallbackBranches.length} branches`);
  console.log("");
  console.log("Lưu ý: chưa tạo Store nào — vào apps/dashboard, tab \"Quán\" (Stores) để");
  console.log("provision quán đầu tiên và lấy Store ID + API key cho apps/pos-local.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
