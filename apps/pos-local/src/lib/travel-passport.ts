/**
 * lib/travel-passport.ts — "Hộ chiếu Đà Lạt": không cần tài khoản, không lưu
 * server, lưu hoàn toàn phía trình duyệt khách bằng localStorage. Đổi thiết
 * bị/xoá cache sẽ mất lịch sử — chấp nhận được (quyết định đã chốt), không
 * cần giải pháp phức tạp hơn (không yêu cầu số điện thoại).
 */

const STORAGE_KEY = "visited_locations";

function readRaw(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeRaw(ids: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh, site data bị khoá) — bỏ
    // qua, tính năng chỉ là "nice to have", không chặn luồng chính.
  }
}

export function getVisitedLocationIds(): string[] {
  return readRaw();
}

export function isLocationVisited(locationId: string): boolean {
  return readRaw().includes(locationId);
}

export function markLocationVisited(locationId: string): string[] {
  const current = readRaw();
  if (current.includes(locationId)) return current;
  const next = [...current, locationId];
  writeRaw(next);
  return next;
}

export function unmarkLocationVisited(locationId: string): string[] {
  const next = readRaw().filter((id) => id !== locationId);
  writeRaw(next);
  return next;
}
