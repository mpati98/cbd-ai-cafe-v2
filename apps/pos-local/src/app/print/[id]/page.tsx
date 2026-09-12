import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PrintPhotoView from "@/components/PrintPhotoView";
import { isOpsAuthed } from "@/lib/ops-auth";

export const metadata: Metadata = {
  title: "In ảnh — CBD AI Cafe",
  robots: { index: false, follow: false },
};

export default async function PrintPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isOpsAuthed())) {
    redirect(`/ops/print-photos/login?next=${encodeURIComponent(`/print/${id}`)}`);
  }
  return <PrintPhotoView id={id} />;
}
