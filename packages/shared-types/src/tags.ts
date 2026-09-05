/**
 * Tag gắn cho món trong thực đơn — Claude dùng các nhãn này (qua tagLabel())
 * để hiểu đặc điểm từng món khi tư vấn (xem src/lib/order-chat.ts). Mỗi trục
 * là 1 cặp đối lập — món nên gắn tối đa 1 tag mỗi trục để đặc điểm rõ ràng.
 */
export type TagOption = { value: string; label: string };
export type TagAxis = { key: string; question: string; options: TagOption[] };

export const TAG_AXES: TagAxis[] = [
  {
    key: "intensity",
    question: "Bạn thích vị đậm đà hay nhẹ nhàng, thanh mát?",
    options: [
      { value: "dam", label: "Đậm đà ☕" },
      { value: "nhe", label: "Nhẹ nhàng, thanh mát 🍃" },
    ],
  },
  {
    key: "temperature",
    question: "Bạn muốn dùng nóng hay đá/lạnh?",
    options: [
      { value: "lanh", label: "Đá / lạnh 🧊" },
      { value: "nong", label: "Nóng 🔥" },
    ],
  },
  {
    key: "flavor",
    question: "Bạn thích vị trái cây ngọt thanh, hay cà phê/trà truyền thống hơn?",
    options: [
      { value: "trai-cay", label: "Trái cây, ngọt thanh 🍑" },
      { value: "truyen-thong", label: "Cà phê / trà truyền thống 🍵" },
    ],
  },
];

export const ALL_TAG_OPTIONS: TagOption[] = TAG_AXES.flatMap((axis) => axis.options);

export function tagLabel(value: string): string {
  return ALL_TAG_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
