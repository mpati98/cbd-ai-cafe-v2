import { redirect } from "next/navigation";
import OpsSurveyPanel from "@/components/OpsSurveyPanel";
import { isOpsAuthed } from "@/lib/ops-auth";

export default async function OpsSurveyPage() {
  if (!(await isOpsAuthed())) {
    redirect("/ops/print-photos/login?next=%2Fops%2Fsurvey");
  }
  return <OpsSurveyPanel />;
}
