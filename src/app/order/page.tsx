import type { Metadata } from "next";
import OrderExperience from "@/components/order/OrderExperience";
import { getMenuItems } from "@/lib/content";

export const metadata: Metadata = {
  title: "Đặt món — CBD AI Cafe",
  description: "Đặt món cùng CBD Robot — trò chuyện để nhận gợi ý đồ uống phù hợp với bạn.",
};

export const revalidate = 60;

export default async function OrderPage() {
  const items = await getMenuItems();
  const sorted = [...items].sort((a, b) => a.order - b.order);

  return <OrderExperience items={sorted} />;
}
