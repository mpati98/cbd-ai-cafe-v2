/**
 * lib/knowledge-scoring.ts
 * -----------------------------------------------------------------------
 * 1) recomputeTopicScores(): chạy định kỳ (cron / sau mỗi N lượt chat)
 *    để tính lại score + tier ("hot" | "longtail") dựa trên askCount.
 *    Topic nào nằm trong nhóm chiếm 80% tổng lượt hỏi (cumulative) ->
 *    tier "hot". Phần còn lại -> "longtail".
 *
 * 2) selectTopicsForQuery(): dùng lúc trả lời khách - ưu tiên match
 *    keyword trực tiếp trước, sau đó lấp đầy context theo tỷ lệ
 *    80% slot từ nhóm "hot", 20% slot từ nhóm "longtail" (xoay vòng để
 *    topic hiếm vẫn có cơ hội được đưa vào context theo thời gian).
 *
 * 3) recordTopicUsage(): gọi sau khi 1 topic được dùng để trả lời,
 *    tăng askCount +1 (dùng để tính lại score ở bước 1).
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

export async function recordTopicUsage(topicId: string) {
  const db = requireDb();
  await db.knowledgeTopic.update({
    where: { id: topicId },
    data: { askCount: { increment: 1 } },
  });
}

/**
 * Chọn ra tối đa `maxTopics` để nhét vào context câu trả lời cho 1 câu hỏi.
 * Ưu tiên: match keyword trực tiếp trước (luôn được chọn, bất kể tier),
 * sau đó lấp chỗ trống theo tỷ lệ ~80% hot / ~20% longtail.
 */
export async function selectTopicsForQuery(userMessage: string, maxTopics = 6) {
  const msg = userMessage.toLowerCase();
  const db = requireDb();
  const allTopics = await db.knowledgeTopic.findMany();

  const directMatches = allTopics.filter((t) =>
    t.keywords.some((k) => msg.includes(k.toLowerCase()))
  );

  const remainingSlots = maxTopics - directMatches.length;
  if (remainingSlots <= 0) {
    return directMatches.slice(0, maxTopics);
  }

  const usedIds = new Set(directMatches.map((t) => t.id));
  const hotPool = allTopics
    .filter((t) => t.tier === "hot" && !usedIds.has(t.id))
    .sort((a, b) => b.score - a.score);
  const longtailPool = allTopics
    .filter((t) => t.tier === "longtail" && !usedIds.has(t.id))
    // xoay vòng theo lần cập nhật gần nhất thay vì luôn lấy cùng 1 nhóm
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  const hotSlots = Math.ceil(remainingSlots * 0.8);
  const longtailSlots = remainingSlots - hotSlots;

  const filled = [
    ...directMatches,
    ...hotPool.slice(0, hotSlots),
    ...longtailPool.slice(0, longtailSlots),
  ];

  return filled.slice(0, maxTopics);
}

/**
 * Build đoạn text để chèn vào system prompt từ danh sách topic đã chọn.
 */
export function buildKnowledgeContextBlock(
  topics: { title: string; content: string }[]
) {
  if (topics.length === 0) return "";
  return [
    "### KIẾN THỨC LIÊN QUAN (đã học từ tài liệu upload):",
    ...topics.map((t) => `- ${t.title}: ${t.content}`),
  ].join("\n");
}
