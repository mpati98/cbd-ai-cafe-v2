import { ApiError } from "@/lib/api";

/** Trần độ dài slug — khớp giới hạn `tableCode` ở các schema (order/chat). */
export const TABLE_CODE_MAX = 60;

/**
 * Biến tên bàn thành mã dùng trong URL QR: /order/t/{code}.
 * "Bàn 01" → "ban-01", "Sân vườn 2" → "san-vuon-2", "Đặc biệt" → "dac-biet".
 * Bỏ dấu tiếng Việt (đ/Đ không tách được bằng NFD nên xử lý riêng), chữ thường,
 * mọi cụm ký tự khác a-z0-9 gộp thành 1 dấu gạch ngang.
 */
export function slugifyTableLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TABLE_CODE_MAX)
    .replace(/-+$/g, "");
}

/** Như trên nhưng ném 400 nếu tên không chứa chữ/số nào (vd "!!!") — không tạo được link. */
export function tableCodeFromLabel(label: string): string {
  const code = slugifyTableLabel(label);
  if (!code) throw new ApiError(400, "Tên bàn cần có ít nhất 1 chữ cái hoặc chữ số.");
  return code;
}
