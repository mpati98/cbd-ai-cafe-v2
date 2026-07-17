-- 1) Tạo bảng KnowledgeCategory (phần Prisma tự generate, giữ nguyên)
CREATE TABLE "KnowledgeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KnowledgeCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeCategory_name_key" ON "KnowledgeCategory"("name");
CREATE UNIQUE INDEX "KnowledgeCategory_slug_key" ON "KnowledgeCategory"("slug");

-- THÊM MỚI: seed sẵn 4 category gốc + 1 category "Khác" để backfill dữ liệu cũ
INSERT INTO "KnowledgeCategory" ("id", "name", "slug", "sortOrder", "updatedAt") VALUES
  ('cat_cafe_default',       'Cafe',                'cafe',                1, CURRENT_TIMESTAMP),
  ('cat_vanhoa_default',     'Văn hóa',              'van-hoa',             2, CURRENT_TIMESTAMP),
  ('cat_checkin_default',    'Địa điểm check-in',    'dia-diem-check-in',   3, CURRENT_TIMESTAMP),
  ('cat_robotics_default',   'CBD Robotics',         'cbd-robotics',        4, CURRENT_TIMESTAMP),
  ('cat_khac_default',       'Khác',                 'khac',                999, CURRENT_TIMESTAMP);

-- 2) Thêm cột categoryId dạng NULLABLE trước (KHÔNG NOT NULL vội)
ALTER TABLE "KnowledgeTopic" ADD COLUMN "categoryId" TEXT;

-- THÊM MỚI: gán toàn bộ topic cũ (chưa có category) vào category "Khác"
UPDATE "KnowledgeTopic" SET "categoryId" = 'cat_khac_default' WHERE "categoryId" IS NULL;

-- 3) Giờ mới bắt buộc NOT NULL (phần Prisma generate, giữ nguyên nhưng đảm bảo
--    đặt SAU bước UPDATE ở trên)
ALTER TABLE "KnowledgeTopic" ALTER COLUMN "categoryId" SET NOT NULL;

-- 4) Thêm foreign key (phần Prisma tự generate, giữ nguyên)
ALTER TABLE "KnowledgeTopic" ADD CONSTRAINT "KnowledgeTopic_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "KnowledgeTopic_categoryId_idx" ON "KnowledgeTopic"("categoryId");

-- 5) Nếu bản cũ của bạn có cột "category" (string tự do), Prisma sẽ tự thêm
--    dòng DROP COLUMN cho nó - giữ nguyên dòng đó, chạy SAU khi đã backfill xong:
-- ALTER TABLE "KnowledgeTopic" DROP COLUMN "category";