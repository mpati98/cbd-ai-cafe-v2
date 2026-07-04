export type HeroSlide = {
  id: string;
  order: number;
  eyebrow: string;
  title: string;
  body: string;
  imageId: string | null;
};

export type MenuItem = {
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

export type RoadmapItem = {
  id: string;
  period: string;
  title: string;
  description: string;
  order: number;
};

export type BranchStatus = "PLANNING" | "SCOUTING" | "LEASING" | "FIT_OUT" | "OPEN";

export type Branch = {
  id: string;
  name: string;
  city: string;
  status: BranchStatus;
  etaLabel: string;
  description: string;
  order: number;
};

export const BRANCH_STATUS_OPTIONS: { value: BranchStatus; label: string }[] = [
  { value: "PLANNING", label: "Lên kế hoạch thiết kế" },
  { value: "SCOUTING", label: "Khảo sát vị trí" },
  { value: "LEASING", label: "Đang tìm mặt bằng" },
  { value: "FIT_OUT", label: "Đang hoàn thiện nội thất" },
  { value: "OPEN", label: "Đã khai trương" },
];

export { formatVnd } from "@/lib/format";

export type MediaAsset = {
  id: string;
  purpose: "HERO" | "MENU";
  note: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
  createdAt: string;
};

export type OrderItemRow = {
  id: string;
  menuItemId: string | null;
  nameSnapshot: string;
  priceVndSnapshot: number;
  quantity: number;
};

export type Order = {
  id: string;
  customerName: string | null;
  customerNote: string | null;
  adminNote: string | null;
  tableLabel: string | null;
  totalVnd: number;
  isReceived: boolean;
  isPreparing: boolean;
  isPaid: boolean;
  isDelivered: boolean;
  isCancelled: boolean;
  items: OrderItemRow[];
  createdAt: string;
  updatedAt: string;
};

export type TableRow = {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  createdAt: string;
};

export type StatsResponse = {
  totalOrders: number;
  ordersToday: number;
  completedOrders: number;
  inProgressOrders: number;
  cancelledOrders: number;
  totalRevenueVnd: number;
  topItems: { menuItemId: string | null; name: string; quantitySold: number }[];
};
