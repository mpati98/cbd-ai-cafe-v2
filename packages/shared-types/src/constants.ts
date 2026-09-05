/**
 * Hằng số thuần, KHÔNG import gì từ prisma/server — an toàn để dùng ở cả
 * Client Component lẫn Server Component (xem lý do tách file ở format.ts).
 */
export const BRANCH_STATUS_LABEL: Record<string, string> = {
  PLANNING: "Lên kế hoạch thiết kế",
  SCOUTING: "Khảo sát vị trí",
  LEASING: "Đang tìm mặt bằng",
  FIT_OUT: "Đang hoàn thiện nội thất",
  OPEN: "Đã khai trương",
};
