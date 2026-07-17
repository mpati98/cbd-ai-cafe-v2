/**
 * app/api/admin/knowledge/route.ts
 * -----------------------------------------------------------------------
 * GET  -> danh sách tất cả topic (kèm document gốc nếu có), dùng cho
 *         trang quản lý.
 * POST -> admin thêm topic thủ công (không qua PDF), isManual = true.
 * -----------------------------------------------------------------------
 */

import { NextRequest } from "next/server";
import { created, ok, parseBody, requirePermission, requireDb, withErrorHandling } from "@/lib/api";
import { knowledgeTopicCreateSchema } from "@/lib/schemas";
import { recomputeTopicScores } from "@/lib/knowledge-scoring";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "knowledge");
  const db = requireDb();
  const topics = await db.knowledgeTopic.findMany({
    include: { document: { select: { fileName: true } } },
    orderBy: [{ tier: "asc" }, { askCount: "desc" }],
  });
  return ok({ topics });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requirePermission(req, "knowledge");
  const { title, content, categoryId, keywords } = await parseBody(req, knowledgeTopicCreateSchema);
  const db = requireDb();

  const topic = await db.knowledgeTopic.create({
    data: { title, content, categoryId, keywords, isManual: true },
  });

  await recomputeTopicScores();

  return created({ topic });
});
