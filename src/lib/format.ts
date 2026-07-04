/**
 * Hàm định dạng thuần, KHÔNG import gì từ prisma/server — an toàn để dùng ở
 * cả Client Component lẫn Server Component. Cố tình tách riêng khỏi
 * `content.ts` (nơi có import prisma) để tránh Next.js kéo theo toàn bộ code
 * Prisma vào bundle trình duyệt chỉ vì 1 component client cần format giá tiền.
 */
export function formatVnd(value: number): string {
  return value.toLocaleString("vi-VN") + "đ";
}
