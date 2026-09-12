/**
 * DTO chung cho dữ liệu thực đơn/knowledge được đồng bộ CLOUD -> POS-LOCAL
 * (xem sync.ts cho phần contract sync/outbox). Đây là "hình dạng trên dây"
 * (wire shape) — không phải model Prisma trực tiếp, để 2 phía cloud/local
 * không lệch nhau khi 1 bên đổi schema nội bộ.
 */

export type MenuItemDTO = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  isBestSeller: boolean;
  order: number;
  imageId: string | null;
  tags: string[];
};

export type KnowledgeTopicDTO = {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  content: string;
  keywords: string[];
  tier: string;
  score: number;
};

export type SystemPromptDTO = {
  version: number;
  content: string;
};

/** Chỉ location đã `status = APPROVED` mới bao giờ được đưa vào DTO này. */
export type LocationDTO = {
  id: string;
  name: string;
  description: string;
  category: string;
  bestTimeToVisit: string | null;
  relatedLocationIds: string[];
};
