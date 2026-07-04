import type { ReactNode } from "react";
import type { MediaPurpose } from "@/lib/media";
import type { PermissionKey } from "@/lib/permissions";
import {
  BRANCH_STATUS_OPTIONS,
  Branch,
  formatVnd,
  HeroSlide,
  MenuItem,
  RoadmapItem,
} from "@/types/admin";

export type FieldDef<T> =
  | { key: keyof T & string; label: string; type: "text"; required?: boolean; placeholder?: string }
  | { key: keyof T & string; label: string; type: "textarea"; required?: boolean; placeholder?: string }
  | { key: keyof T & string; label: string; type: "number"; required?: boolean; min?: number }
  | { key: keyof T & string; label: string; type: "checkbox" }
  | { key: keyof T & string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: keyof T & string; label: string; type: "image"; purpose: MediaPurpose }
  | { key: keyof T & string; label: string; type: "tags" };

export type ColumnDef<T> = {
  key: keyof T & string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
};

export type ResourceConfig<T extends { id: string }> = {
  key: string;
  /** Quyền cần có để thấy/thao tác tab này — xem src/lib/permissions.ts */
  permission: PermissionKey;
  title: string;
  endpoint: string;
  description: string;
  fields: FieldDef<T>[];
  columns: ColumnDef<T>[];
  emptyValues: Omit<T, "id">;
};

export const heroSlideConfig: ResourceConfig<HeroSlide> = {
  key: "hero-slides",
  permission: "hero",
  title: "Hero — Câu chuyện",
  endpoint: "/api/hero-slides",
  description: "3 câu chuyện xoay vòng trong carousel đầu trang (Cà phê / Đà Lạt / CBD Robot).",
  fields: [
    { key: "order", label: "Thứ tự", type: "number", required: true, min: 0 },
    { key: "eyebrow", label: "Nhãn nhỏ (eyebrow)", type: "text", required: true, placeholder: "Câu chuyện thứ nhất — Cà phê" },
    { key: "title", label: "Tiêu đề", type: "text", required: true },
    { key: "body", label: "Nội dung", type: "textarea", required: true },
    { key: "imageId", label: "Ảnh nền slide", type: "image", purpose: "HERO" },
  ],
  columns: [
    { key: "order", label: "TT", className: "w-12" },
    { key: "eyebrow", label: "Nhãn" },
    { key: "title", label: "Tiêu đề" },
  ],
  emptyValues: { order: 0, eyebrow: "", title: "", body: "", imageId: null },
};

export const menuItemConfig: ResourceConfig<MenuItem> = {
  key: "menu-items",
  permission: "menu",
  title: "Thực đơn",
  endpoint: "/api/menu-items",
  description: "Món trong thực đơn. Chỉ nên đánh dấu 1 món là best-seller tại một thời điểm.",
  fields: [
    { key: "order", label: "Thứ tự", type: "number", required: true, min: 0 },
    { key: "code", label: "Mã món", type: "text", required: true, placeholder: "CBD-001" },
    { key: "name", label: "Tên món", type: "text", required: true },
    { key: "description", label: "Mô tả", type: "textarea", required: true },
    { key: "priceVnd", label: "Giá (VNĐ)", type: "number", required: true, min: 0 },
    { key: "isBestSeller", label: "Best seller", type: "checkbox" },
    { key: "imageId", label: "Ảnh món", type: "image", purpose: "MENU" },
    { key: "tags", label: "Tag gợi ý (order-chatbot)", type: "tags" },
  ],
  columns: [
    { key: "order", label: "TT", className: "w-12" },
    { key: "code", label: "Mã" },
    { key: "name", label: "Tên món" },
    { key: "priceVnd", label: "Giá", render: (i) => formatVnd(i.priceVnd) },
    { key: "isBestSeller", label: "Best seller", render: (i) => (i.isBestSeller ? "★" : "") },
  ],
  emptyValues: {
    order: 0,
    code: "",
    name: "",
    description: "",
    priceVnd: 0,
    isBestSeller: false,
    imageId: null,
    tags: [],
  },
};

export const roadmapItemConfig: ResourceConfig<RoadmapItem> = {
  key: "roadmap-items",
  permission: "roadmap",
  title: "Hướng phát triển",
  endpoint: "/api/roadmap-items",
  description: "Các mốc trên timeline lộ trình phát triển.",
  fields: [
    { key: "order", label: "Thứ tự", type: "number", required: true, min: 0 },
    { key: "period", label: "Mốc thời gian", type: "text", required: true, placeholder: "Quý 3 / 2026" },
    { key: "title", label: "Tiêu đề", type: "text", required: true },
    { key: "description", label: "Mô tả", type: "textarea", required: true },
  ],
  columns: [
    { key: "order", label: "TT", className: "w-12" },
    { key: "period", label: "Mốc" },
    { key: "title", label: "Tiêu đề" },
  ],
  emptyValues: { order: 0, period: "", title: "", description: "" },
};

export const branchConfig: ResourceConfig<Branch> = {
  key: "branches",
  permission: "branches",
  title: "Chi nhánh",
  endpoint: "/api/branches",
  description: "Chi nhánh đang mở hoặc sắp mở.",
  fields: [
    { key: "order", label: "Thứ tự", type: "number", required: true, min: 0 },
    { key: "name", label: "Tên chi nhánh", type: "text", required: true, placeholder: "Đà Lạt — Trung Tâm" },
    { key: "city", label: "Thành phố", type: "text", required: true },
    { key: "status", label: "Trạng thái", type: "select", options: BRANCH_STATUS_OPTIONS },
    { key: "etaLabel", label: "Dự kiến khai trương", type: "text", required: true, placeholder: "Quý 3 / 2026" },
    { key: "description", label: "Mô tả", type: "textarea", required: true },
  ],
  columns: [
    { key: "order", label: "TT", className: "w-12" },
    { key: "name", label: "Chi nhánh" },
    { key: "city", label: "Thành phố" },
    {
      key: "status",
      label: "Trạng thái",
      render: (i) => BRANCH_STATUS_OPTIONS.find((o) => o.value === i.status)?.label ?? i.status,
    },
    { key: "etaLabel", label: "Dự kiến" },
  ],
  emptyValues: {
    order: 0,
    name: "",
    city: "",
    status: "PLANNING",
    etaLabel: "",
    description: "",
  },
};

export const resourceConfigs: ResourceConfig<any>[] = [
  heroSlideConfig,
  menuItemConfig,
  roadmapItemConfig,
  branchConfig,
];
