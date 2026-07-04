export const BRANCH_STATUS_LABEL: Record<string, string> = {
  PLANNING: "Lên kế hoạch thiết kế",
  SCOUTING: "Khảo sát vị trí",
  LEASING: "Đang tìm mặt bằng",
  FIT_OUT: "Đang hoàn thiện nội thất",
  OPEN: "Đã khai trương",
};

export function formatVnd(value: number) {
  return value.toLocaleString("vi-VN") + "đ";
}
