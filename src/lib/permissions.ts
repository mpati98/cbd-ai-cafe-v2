/**
 * Danh sách quyền theo từng tab trong /admin. Dùng cho cả server (kiểm tra
 * quyền trong API route) lẫn client (ẩn/hiện tab, form cấp quyền ở
 * UsersPanel) — file thuần, không đụng Prisma/bcrypt nên an toàn dùng ở
 * Client Component.
 *
 * ADMIN luôn có toàn quyền, bỏ qua danh sách này. STAFF chỉ thấy/thao tác
 * được tab nào nằm trong `user.permissions`.
 */
export const PERMISSIONS = [
  { key: "hero", label: "Hero" },
  { key: "menu", label: "Thực đơn" },
  { key: "roadmap", label: "Hướng phát triển" },
  { key: "branches", label: "Chi nhánh" },
  { key: "media", label: "Thư viện ảnh" },
  { key: "orders", label: "Đơn hàng & Thống kê" },
  { key: "tables", label: "Bàn & QR" },
  { key: "knowledge", label: "Kiến thức" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

export function isValidPermissionKey(key: string): key is PermissionKey {
  return (PERMISSION_KEYS as string[]).includes(key);
}
