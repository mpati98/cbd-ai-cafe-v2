import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Divider from "@/components/Divider";
import Menu from "@/components/Menu";
import Roadmap from "@/components/Roadmap";
import Footer from "@/components/Footer";
import { getBranches, getHeroSlides, getMenuItems, getRoadmapItems } from "@/lib/content";

// Always fetch fresh content from Neon on request (menu/roadmap/branches can change often).
export const revalidate = 60;

export default async function Home() {
  const [heroSlides, menuItems, roadmapItems, branches] = await Promise.all([
    getHeroSlides(),
    getMenuItems(),
    getRoadmapItems(),
    getBranches(),
  ]);

  return (
    <>
      <Nav />
      <Hero slides={heroSlides} />
      <Divider />
      <Menu items={menuItems} />
      <Divider flip />
      <Roadmap roadmap={roadmapItems} branches={branches} />
      <Footer />
    </>
  );
}
