// Static fallback content — used only if DATABASE_URL / Neon isn't configured yet,
// so the site still renders during first-time setup. Once Prisma + Neon are wired up
// (see README), real data from the database takes over automatically.

export const fallbackHeroSlides: {
  id: string;
  order: number;
  eyebrow: string;
  title: string;
  body: string;
  imageId: string | null;
}[] = [
  {
    id: "s1",
    order: 0,
    imageId: null,
    eyebrow: "Câu chuyện thứ nhất — Cà phê",
    title: "Mỗi hạt cà phê là một ký ức được rang lên",
    body: "Từ những vườn arabica trên cao nguyên, CBD AI Cafe chọn lọc từng hạt để giữ trọn vị chua thanh và hậu ngọt dịu đặc trưng của vùng đất cao. Chúng tôi không chỉ pha cà phê — chúng tôi pha cả một câu chuyện.",
  },
  {
    id: "s2",
    order: 1,
    imageId: null,
    eyebrow: "Câu chuyện thứ hai — Đà Lạt",
    title: "Thành phố sương mù, nơi mọi tách cà phê bắt đầu",
    body: "Khí hậu se lạnh quanh năm, những đồi thông và thung lũng hoa là lý do vì sao cà phê Đà Lạt mang một vị đậm đà rất riêng. CBD AI Cafe mang không khí cao nguyên ấy đến gần bạn hơn, dù bạn đang ở đâu.",
  },
  {
    id: "s3",
    order: 2,
    imageId: null,
    eyebrow: "Câu chuyện thứ ba — CBD Robot",
    title: "Người bạn AI đứng sau quầy pha chế",
    body: "CBD Robot gợi ý đồ uống theo khẩu vị riêng của bạn, kể chuyện, và học cách pha một ly \"chuẩn bạn\" hơn mỗi ngày. Công nghệ đấy — nhưng vẫn ấm như một tách cà phê buổi sáng.",
  },
];

export const fallbackMenuItems: {
  id: string;
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  isBestSeller: boolean;
  order: number;
  imageId: string | null;
  tags: string[];
}[] = [
  {
    id: "m0",
    code: "CBD-001",
    name: "CBD Robot Latte",
    description:
      "Espresso đậm đà hoà cùng sữa tươi đánh bông vẽ hình mạch vi xử lý — món signature được CBD Robot đề xuất nhiều nhất mỗi sáng.",
    priceVnd: 59000,
    isBestSeller: true,
    order: 0,
    imageId: null,
    tags: ["dam", "nong", "truyen-thong"],
  },
  {
    id: "m1",
    code: "CBD-002",
    name: "Cà Phê Sữa Đá Đà Lạt",
    description: "Cà phê phin truyền thống, đậm và thơm theo đúng chuẩn cao nguyên.",
    priceVnd: 39000,
    isBestSeller: false,
    order: 1,
    imageId: null,
    tags: ["dam", "lanh", "truyen-thong"],
  },
  {
    id: "m2",
    code: "CBD-003",
    name: "Bạc Xỉu Sương Mù",
    description: "Vị béo nhẹ như làn sương sớm phủ trên những đồi thông.",
    priceVnd: 42000,
    isBestSeller: false,
    order: 2,
    imageId: null,
    tags: ["nhe", "lanh", "truyen-thong"],
  },
  {
    id: "m3",
    code: "CBD-004",
    name: "Cold Brew Tầng Mây",
    description: "Ủ lạnh 18 giờ, êm dịu và tỉnh táo suốt cả ngày dài.",
    priceVnd: 49000,
    isBestSeller: false,
    order: 3,
    imageId: null,
    tags: ["dam", "lanh", "truyen-thong"],
  },
  {
    id: "m4",
    code: "CBD-005",
    name: "Trà Đào Cam Sả CBD",
    description: "Thanh mát, thêm chút \"thuật toán\" hương cam sả cân bằng vị ngọt.",
    priceVnd: 45000,
    isBestSeller: false,
    order: 4,
    imageId: null,
    tags: ["nhe", "lanh", "trai-cay"],
  },
  {
    id: "m5",
    code: "CBD-006",
    name: "Matcha Robot Đá Xay",
    description: "Matcha Nhật nguyên chất, xay mịn theo công thức CBD Robot tối ưu.",
    priceVnd: 52000,
    isBestSeller: false,
    order: 5,
    imageId: null,
    tags: ["nhe", "lanh", "trai-cay"],
  },
  {
    id: "m6",
    code: "CBD-007",
    name: "Cacao Đêm Cao Nguyên",
    description: "Ấm nồng vị cacao, dành cho những đêm Đà Lạt se lạnh.",
    priceVnd: 47000,
    isBestSeller: false,
    order: 6,
    imageId: null,
    tags: ["dam", "nong", "truyen-thong"],
  },
];

export const fallbackRoadmapItems = [
  {
    id: "r1",
    period: "Quý 3 / 2026",
    title: "CBD Robot phiên bản giọng nói tiếng Việt",
    description:
      "Gọi món chỉ bằng lời — CBD Robot hiểu giọng vùng miền và gợi ý theo thời tiết trong ngày.",
    order: 0,
  },
  {
    id: "r2",
    period: "Quý 4 / 2026",
    title: "Ứng dụng đặt món & tích điểm CBD AI Cafe",
    description:
      "Đặt trước, tích điểm và nhận gợi ý đồ uống cá nhân hoá ngay trên điện thoại.",
    order: 1,
  },
  {
    id: "r3",
    period: "Quý 1 / 2027",
    title: "Góc trải nghiệm \"AI Lab Corner\"",
    description:
      "Không gian robot pha chế trực tiếp, nơi khách có thể quan sát và trò chuyện cùng CBD Robot.",
    order: 2,
  },
  {
    id: "r4",
    period: "Quý 3 / 2027",
    title: "Chuẩn hoá nguồn cà phê hữu cơ",
    description:
      "Toàn bộ chi nhánh chuyển sang chuỗi cung ứng cà phê hữu cơ đạt chuẩn từ nông trại Đà Lạt.",
    order: 3,
  },
];

export const fallbackBranches = [
  {
    id: "b1",
    name: "Đà Lạt — Trung Tâm",
    city: "Đà Lạt",
    status: "FIT_OUT" as const,
    etaLabel: "Quý 3 / 2026",
    description: "Chi nhánh chủ lực, đặt cạnh khu Hoà Bình — nơi câu chuyện CBD AI Cafe bắt đầu.",
    order: 0,
  },
  {
    id: "b2",
    name: "Hồ Chí Minh — Quận 1",
    city: "Hồ Chí Minh",
    status: "LEASING" as const,
    etaLabel: "Quý 4 / 2026",
    description: "Mang hơi thở cao nguyên đến trung tâm thành phố năng động nhất cả nước.",
    order: 1,
  },
  {
    id: "b3",
    name: "Hà Nội — Hoàn Kiếm",
    city: "Hà Nội",
    status: "PLANNING" as const,
    etaLabel: "Quý 1 / 2027",
    description: "Không gian ấm áp giữa lòng phố cổ, kết hợp nét hiện đại của CBD Robot.",
    order: 2,
  },
  {
    id: "b4",
    name: "Đà Nẵng — Ven biển",
    city: "Đà Nẵng",
    status: "SCOUTING" as const,
    etaLabel: "Quý 2 / 2027",
    description: "Điểm dừng chân mới, nơi vị cà phê cao nguyên gặp gió biển miền Trung.",
    order: 3,
  },
];
