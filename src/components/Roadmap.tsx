import Reveal from "@/components/Reveal";
import RoadmapTabs from "@/components/RoadmapTabs";

type RoadmapItem = { id: string; period: string; title: string; description: string };
type Branch = {
  id: string;
  name: string;
  status: string;
  etaLabel: string;
  description: string;
};

export default function Roadmap({
  roadmap,
  branches,
}: {
  roadmap: RoadmapItem[];
  branches: Branch[];
}) {
  return (
    <section
      id="roadmap"
      className="snap-section relative bg-latte-950 px-5 py-16 sm:px-8 lg:flex lg:h-[calc(100vh-80px)] lg:min-h-[640px] lg:flex-col lg:py-10"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:min-h-0">
        <Reveal className="mb-8 max-w-xl shrink-0 lg:mb-6">
          <span className="eyebrow mb-3 text-orange-400">Hướng phát triển</span>
          <h2 className="font-display text-3xl font-extrabold leading-tight text-latte-100 sm:text-4xl">
            Lộ trình sắp tới của CBD AI Cafe
          </h2>
          <p className="mt-3 text-latte-200/90">
            Từ một góc pha chế nhỏ ở Đà Lạt, CBD AI Cafe đang từng bước mở rộng — cả về công nghệ lẫn
            những chi nhánh mới.
          </p>
        </Reveal>

        <Reveal delay={80} className="lg:min-h-0 lg:flex-1">
          <RoadmapTabs roadmap={roadmap} branches={branches} />
        </Reveal>
      </div>
    </section>
  );
}
