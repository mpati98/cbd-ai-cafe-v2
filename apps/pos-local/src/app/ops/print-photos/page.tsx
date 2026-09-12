import { redirect } from "next/navigation";
import OpsPrintPhotosPanel from "@/components/OpsPrintPhotosPanel";
import { isOpsAuthed } from "@/lib/ops-auth";

export default async function OpsPrintPhotosPage() {
  if (!(await isOpsAuthed())) {
    redirect("/ops/print-photos/login");
  }
  return <OpsPrintPhotosPanel />;
}
