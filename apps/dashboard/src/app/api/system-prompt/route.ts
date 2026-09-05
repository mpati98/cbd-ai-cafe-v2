import { NextRequest } from "next/server";
import { ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { systemPromptUpdateSchema } from "@/lib/schemas";
import { bumpConfigVersion } from "@/lib/config-version";

export const dynamic = "force-dynamic";

// GET /api/system-prompt — nội dung + version hiện tại của template order-chat.
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "systemPrompt");
  const db = requireDb();
  const config = await db.systemPromptConfig.findUnique({ where: { id: "singleton" } });
  return ok(config ?? { id: "singleton", version: 0, content: "" });
});

// PATCH /api/system-prompt — sửa nội dung, tự tăng version + bump configVersion
// để pos-local pull bản mới ở lần config-sync kế tiếp. Placeholder bắt buộc
// giữ nguyên trong nội dung: {{TABLE_LINE}} và {{MENU_BLOCK}} — xem
// apps/pos-local/src/lib/order-chat.ts::buildSystemPrompt().
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "systemPrompt");
  const { content } = await parseBody(req, systemPromptUpdateSchema);
  const db = requireDb();

  const existing = await db.systemPromptConfig.findUnique({ where: { id: "singleton" } });
  const nextVersion = (existing?.version ?? 0) + 1;

  const config = await db.systemPromptConfig.upsert({
    where: { id: "singleton" },
    update: { content, version: nextVersion },
    create: { id: "singleton", content, version: 1 },
  });

  void bumpConfigVersion();
  return ok(config);
});
