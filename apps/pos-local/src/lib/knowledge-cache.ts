/**
 * lib/knowledge-cache.ts (apps/pos-local)
 * -----------------------------------------------------------------------
 * Bản local của lib/knowledge-scoring.ts cũ — cùng logic chọn topic
 * (keyword match trước, rồi lấp ~80% hot/~20% longtail), nhưng đọc từ
 * KnowledgeTopicCache (đồng bộ xuống từ dashboard) thay vì Postgres trực
 * tiếp, và ghi nhận lượt hỏi vào `pendingAskDelta` cục bộ thay vì tăng
 * askCount ngay — lib/sync.ts gom các delta này gửi lên dashboard theo chu kỳ
 * (xem drainOutbox), dashboard mới là nơi cộng dồn askCount + recompute
 * score/tier chính thức.
 * -----------------------------------------------------------------------
 */

import { requireDb } from "@/lib/api";

type CachedTopic = {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  tier: string;
  score: number;
};

/** Chọn tối đa `maxTopics` topic để nhét vào context câu trả lời. */
export async function selectTopicsForQuery(userMessage: string, maxTopics = 6): Promise<CachedTopic[]> {
  const db = requireDb();
  const msg = userMessage.toLowerCase();
  const rows = await db.knowledgeTopicCache.findMany();
  const allTopics: CachedTopic[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    keywords: JSON.parse(r.keywordsJson) as string[],
    tier: r.tier,
    score: r.score,
  }));

  const directMatches = allTopics.filter((t) => t.keywords.some((k) => msg.includes(k.toLowerCase())));

  const remainingSlots = maxTopics - directMatches.length;
  if (remainingSlots <= 0) return directMatches.slice(0, maxTopics);

  const usedIds = new Set(directMatches.map((t) => t.id));
  const hotPool = allTopics.filter((t) => t.tier === "hot" && !usedIds.has(t.id)).sort((a, b) => b.score - a.score);
  // longtail xoay vòng theo thứ tự trong mảng gốc (đã sắp theo id) — đủ tốt ở
  // quy mô nhỏ hiện tại; bản gốc (cloud) xoay theo updatedAt vì có nhiều dữ
  // liệu hơn để phân biệt.
  const longtailPool = allTopics.filter((t) => t.tier === "longtail" && !usedIds.has(t.id));

  const hotSlots = Math.ceil(remainingSlots * 0.8);
  const longtailSlots = remainingSlots - hotSlots;

  return [...directMatches, ...hotPool.slice(0, hotSlots), ...longtailPool.slice(0, longtailSlots)].slice(0, maxTopics);
}

export function buildKnowledgeContextBlock(topics: { title: string; content: string }[]): string {
  if (topics.length === 0) return "";
  return [
    "### KIẾN THỨC LIÊN QUAN (đã học từ tài liệu upload):",
    ...topics.map((t) => `- ${t.title}: ${t.content}`),
  ].join("\n");
}

/** Cộng dồn cục bộ — được đẩy lên dashboard theo chu kỳ (xem lib/sync.ts). */
export async function recordTopicAsk(topicId: string): Promise<void> {
  const db = requireDb();
  await db.knowledgeTopicCache.update({
    where: { id: topicId },
    data: { pendingAskDelta: { increment: 1 } },
  });
}
