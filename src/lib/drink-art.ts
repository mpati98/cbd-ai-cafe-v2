import { DrinkArtVariant } from "@/components/DrinkArt";

/** Món hiện có trong thực đơn mẫu — gán minh hoạ đúng loại đồ uống. */
const KNOWN_CODE_VARIANT: Record<string, DrinkArtVariant> = {
  "CBD-001": "latte",
  "CBD-002": "iced-coffee",
  "CBD-003": "milk-fog",
  "CBD-004": "cold-brew",
  "CBD-005": "fruit-tea",
  "CBD-006": "matcha",
  "CBD-007": "cacao",
};

const FALLBACK_CYCLE: DrinkArtVariant[] = [
  "latte",
  "iced-coffee",
  "milk-fog",
  "cold-brew",
  "fruit-tea",
  "matcha",
  "cacao",
];

/**
 * Trả về minh hoạ phù hợp cho 1 món: ưu tiên khớp theo mã món đã biết,
 * nếu là món mới (mã lạ) thì xoay vòng theo index để thực đơn vẫn đa dạng
 * thay vì lặp lại 1 kiểu minh hoạ.
 */
export function getDrinkArtVariant(code: string, index: number): DrinkArtVariant {
  return KNOWN_CODE_VARIANT[code] ?? FALLBACK_CYCLE[index % FALLBACK_CYCLE.length];
}
