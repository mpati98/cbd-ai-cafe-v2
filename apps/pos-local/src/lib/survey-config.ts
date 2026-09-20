/**
 * Cấu hình dùng chung cho tính năng "Khảo sát trải nghiệm" — client-safe (không
 * import gì từ server/Prisma), dùng ở cả trang khảo sát, màn hình quản trị và
 * schema validate của API.
 */

export const EXPERIENCE_KEYS = ["tu_order", "du_doan_nghe", "anh_luu_niem", "vivu_dalat"] as const;
export type ExperienceKey = (typeof EXPERIENCE_KEYS)[number];

export const EXPERIENCE_LABELS: Record<ExperienceKey, string> = {
  tu_order: "Tự order tại bàn",
  du_doan_nghe: "Dự đoán nghề nghiệp",
  anh_luu_niem: "Ảnh lưu niệm",
  vivu_dalat: "Vivu Đà Lạt",
};

/** Key trong `details` — khớp mô hình dữ liệu: drink | space | staff | exp_<experienceKey>. */
export const DETAIL_KEYS = [
  "drink",
  "space",
  "staff",
  "exp_tu_order",
  "exp_du_doan_nghe",
  "exp_anh_luu_niem",
  "exp_vivu_dalat",
] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];

/** Nhãn đầy đủ cho từng mức rating 1-5 (index 0 = mức 1). */
export const RATING_LABELS = ["Không hài lòng", "Chưa hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"] as const;

/** Rating <= ngưỡng này sẽ chèn thêm câu hỏi "Điều gì khiến bạn chưa hài lòng...". */
export const LOW_RATING_MAX = 2;
