import { getCloudClient } from "@cbd/database";
import {
  fallbackHeroSlides,
  fallbackMenuItems,
  fallbackRoadmapItems,
  fallbackBranches,
} from "@cbd/shared-types";

const prisma = getCloudClient();

/**
 * Every getter below tries Neon via Prisma first. If DATABASE_URL isn't set yet
 * (e.g. first run, before `npm run db:push:cloud && npm run db:seed:cloud`), or the
 * query fails for any reason, it quietly falls back to static content so the site
 * still renders. Check the server console for a one-time warning.
 */

let warned = false;
function warnFallback(scope: string, err: unknown) {
  if (!warned) {
    console.warn(
      `[CBD AI Cafe] Could not read "${scope}" from Neon — using fallback content. ` +
        `Set DATABASE_URL / DIRECT_URL and run "npm run db:push:cloud && npm run db:seed:cloud" to go live.`,
      err instanceof Error ? err.message : err
    );
    warned = true;
  }
}

export async function getHeroSlides() {
  if (!prisma) return fallbackHeroSlides;
  try {
    const rows = await prisma.heroSlide.findMany({ orderBy: { order: "asc" } });
    if (rows.length) return rows;
    return fallbackHeroSlides;
  } catch (err) {
    warnFallback("hero_slides", err);
    return fallbackHeroSlides;
  }
}

export async function getMenuItems() {
  if (!prisma) return fallbackMenuItems;
  try {
    const rows = await prisma.menuItem.findMany({ orderBy: { order: "asc" } });
    if (rows.length) return rows;
    return fallbackMenuItems;
  } catch (err) {
    warnFallback("menu_items", err);
    return fallbackMenuItems;
  }
}

export async function getRoadmapItems() {
  if (!prisma) return fallbackRoadmapItems;
  try {
    const rows = await prisma.roadmapItem.findMany({ orderBy: { order: "asc" } });
    if (rows.length) return rows;
    return fallbackRoadmapItems;
  } catch (err) {
    warnFallback("roadmap_items", err);
    return fallbackRoadmapItems;
  }
}

export async function getBranches() {
  if (!prisma) return fallbackBranches;
  try {
    const rows = await prisma.branch.findMany({ orderBy: { order: "asc" } });
    if (rows.length) return rows;
    return fallbackBranches;
  } catch (err) {
    warnFallback("branches", err);
    return fallbackBranches;
  }
}
