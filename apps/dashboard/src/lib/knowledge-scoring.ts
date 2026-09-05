/**
 * lib/knowledge-scoring.ts (apps/dashboard)
 * -----------------------------------------------------------------------
 * 1) recomputeTopicScores(): chạy sau mỗi thao tác admin (create/delete/
 *    duyệt PDF topic) VÀ sau mỗi lần nhận ask-delta từ pos-local (xem
 *    /api/sync/push) — tính lại score + tier ("hot" | "longtail") dựa trên
 *    askCount. Topic nào nằm trong nhóm chiếm 80% tổng lượt hỏi (cumulative)
 *    -> tier "hot". Phần còn lại -> "longtail".
 *
 * 2) recordTopicUsage(): cộng dồn askCount theo delta pos-local đẩy lên (chat
 *    thật diễn ra tại quán — xem apps/pos-local/src/lib/knowledge-cache.ts
 *    cho phần chọn topic + đếm cục bộ trước khi đẩy lên).
 * -----------------------------------------------------------------------
 */

import { requireDb } from "./api";

export async function recomputeTopicScores() {
  const db = requireDb();
  const topics = await db.knowledgeTopic.findMany({
    orderBy: { askCount: "desc" },
  });

  const totalAsk = topics.reduce((sum, t) => sum + t.askCount, 0);

  // Topic chưa từng được hỏi (askCount = 0, vd vừa upload) mặc định vào longtail
  if (totalAsk === 0) {
    await db.knowledgeTopic.updateMany({
      data: { tier: "longtail", score: 0 },
    });
    return;
  }

  let cumulative = 0;
  const updates = topics.map((t) => {
    cumulative += t.askCount;
    const cumulativeShare = cumulative / totalAsk;
    const score = t.askCount / totalAsk;
    // Topic nằm trong phần tích lũy đạt 80% lượt hỏi đầu tiên -> "hot"
    const tier = cumulativeShare <= 0.8 || t.askCount === 0 ? "hot" : "longtail";
    return { id: t.id, score, tier: t.askCount === 0 ? "longtail" : tier };
  });

  await db.$transaction(
    updates.map((u) =>
      db.knowledgeTopic.update({
        where: { id: u.id },
        data: { score: u.score, tier: u.tier },
      })
    )
  );
}

/** Cộng dồn `delta` (số lượt hỏi pos-local ghi nhận cục bộ) vào askCount. */
export async function recordTopicUsage(topicId: string, delta: number) {
  const db = requireDb();
  await db.knowledgeTopic.update({
    where: { id: topicId },
    data: { askCount: { increment: delta } },
  });
}
