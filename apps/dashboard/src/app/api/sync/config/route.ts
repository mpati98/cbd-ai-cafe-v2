import { NextRequest } from "next/server";
import { ok, requireDb, withErrorHandling } from "@/lib/api";
import { requireStore } from "@/lib/store-auth";
import type { ConfigSyncResponse } from "@cbd/shared-types";

export const dynamic = "force-dynamic";

// GET /api/sync/config — pos-local gọi định kỳ để lấy menu/knowledge/system
// prompt mới nhất. `since` (query param, tuỳ chọn) chỉ để log/observability —
// vẫn luôn trả full snapshot (dữ liệu nhỏ, không cần diff phức tạp).
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireStore(req);
  const db = requireDb();

  const [configVersion, menuItems, knowledgeTopics, systemPrompt] = await Promise.all([
    db.configVersion.findUnique({ where: { id: "singleton" } }),
    db.menuItem.findMany({ orderBy: { order: "asc" } }),
    db.knowledgeTopic.findMany({ include: { category: { select: { name: true } } } }),
    db.systemPromptConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const body: ConfigSyncResponse = {
    configVersion: configVersion?.version ?? 0,
    menu: menuItems.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description,
      priceVnd: m.priceVnd,
      isBestSeller: m.isBestSeller,
      order: m.order,
      imageId: m.imageId,
      tags: m.tags,
    })),
    knowledgeTopics: knowledgeTopics.map((t) => ({
      id: t.id,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      title: t.title,
      content: t.content,
      keywords: t.keywords,
      tier: t.tier,
      score: t.score,
    })),
    systemPrompt: {
      version: systemPrompt?.version ?? 0,
      content: systemPrompt?.content ?? "",
    },
  };

  return ok(body);
});
