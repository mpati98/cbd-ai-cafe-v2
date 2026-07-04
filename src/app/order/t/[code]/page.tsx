import type { Metadata } from "next";
import OrderExperience from "@/components/order/OrderExperience";
import { getMenuItems, getTableByCode } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const table = await getTableByCode(code);
  return {
    title: table ? `Đặt món — ${table.label} — CBD AI Cafe` : "Đặt món — CBD AI Cafe",
    description: "Đặt món cùng CBD Robot — trò chuyện để nhận gợi ý đồ uống phù hợp với bạn.",
    robots: { index: false, follow: false }, // link riêng cho từng bàn, không cần Google index
  };
}

export default async function OrderByTablePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [items, table] = await Promise.all([getMenuItems(), getTableByCode(code)]);
  const sorted = [...items].sort((a, b) => a.order - b.order);

  return <OrderExperience items={sorted} table={table ? { code, label: table.label } : null} />;
}
