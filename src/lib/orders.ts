export type OrderLike = {
  isReceived: boolean;
  isPreparing: boolean;
  isPaid: boolean;
  isDelivered: boolean;
  isCancelled: boolean;
};

/** 4 bước xử lý đơn, theo đúng thứ tự hiển thị (không nhất thiết phải làm tuần tự). */
export const ORDER_STEPS: { key: keyof Omit<OrderLike, "isCancelled">; label: string }[] = [
  { key: "isReceived", label: "Nhận đơn" },
  { key: "isPreparing", label: "Pha chế" },
  { key: "isPaid", label: "Đã thanh toán" },
  { key: "isDelivered", label: "Giao món" },
];

export type OrderStatus = "CANCELLED" | "COMPLETED" | "IN_PROGRESS";

/** Đơn đã huỷ được ưu tiên hiển thị hơn tiến trình 4 mốc (dù đã làm dở). */
export function getOrderStatus(order: OrderLike): OrderStatus {
  if (order.isCancelled) return "CANCELLED";
  if (order.isReceived && order.isPreparing && order.isPaid && order.isDelivered) return "COMPLETED";
  return "IN_PROGRESS";
}

/** @deprecated dùng getOrderStatus(order) === "COMPLETED" — giữ lại để tương thích ngược. */
export function isOrderCompleted(order: OrderLike): boolean {
  return getOrderStatus(order) === "COMPLETED";
}

export function orderStatusLabel(order: OrderLike): string {
  const status = getOrderStatus(order);
  if (status === "CANCELLED") return "Đã huỷ";
  if (status === "COMPLETED") return "Hoàn tất";
  return "Đang xử lý";
}
