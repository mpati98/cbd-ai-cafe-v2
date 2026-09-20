import type { Metadata } from "next";
import SurveyExperience from "@/components/survey/SurveyExperience";

export const metadata: Metadata = {
  title: "Khảo sát trải nghiệm — CBD AI Cafe",
  description: "Chia sẻ trải nghiệm của bạn tại CBD AI Cafe.",
  robots: { index: false, follow: false },
};

export default function SurveyPage() {
  return <SurveyExperience />;
}
