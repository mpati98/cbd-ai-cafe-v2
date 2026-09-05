/**
 * Kích thước chuẩn cho từng mục đích sử dụng ảnh. Dùng chung ở cả API upload
 * (server, xử lý bằng sharp) và UI admin (client, hiển thị label/ghi chú).
 */
export const MEDIA_PRESETS = {
  HERO: {
    width: 1920,
    height: 1080,
    label: "Hero — nền/minh hoạ slide câu chuyện",
    ratioLabel: "1920×1080 (16:9)",
  },
  MENU: {
    width: 900,
    height: 900,
    label: "Thực đơn — ảnh món / thumbnail",
    ratioLabel: "900×900 (vuông)",
  },
} as const;

export type MediaPurpose = keyof typeof MEDIA_PRESETS;

export const MEDIA_PURPOSE_OPTIONS: { value: MediaPurpose; name: string; ratioLabel: string; label: string }[] = (
  Object.keys(MEDIA_PRESETS) as MediaPurpose[]
).map((value) => ({
  value,
  name: MEDIA_PRESETS[value].label,
  ratioLabel: MEDIA_PRESETS[value].ratioLabel,
  label: `${MEDIA_PRESETS[value].label} (${MEDIA_PRESETS[value].ratioLabel})`,
}));

export function imageUrl(id: string | null | undefined): string | undefined {
  return id ? `/api/images/${id}` : undefined;
}

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB nguồn vào, trước khi nén
