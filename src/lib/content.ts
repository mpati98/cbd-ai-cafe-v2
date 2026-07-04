import { prisma } from "@/lib/prisma";
import {
  fallbackHeroSlides,
  fallbackMenuItems,
  fallbackRoadmapItems,
  fallbackBranches,
} from "@/lib/fallback-data";

/**
 * Every getter below tries Neon via Prisma first. If DATABASE_URL isn't set yet
 * (e.g. first run, before `npm run db:push && npm run db:seed`), or the query
 * fails for any reason, it quietly falls back to static content so the site
 * still renders. Check the server console for a one-time warning.
 */

let warned = false;
function warnFallback(scope: string, err: unknown) {
  if (!warned) {
    console.warn(
      `[CBD AI Cafe] Could not read "${scope}" from Neon — using fallback content. ` +
        `Set DATABASE_URL / DIRECT_URL and run "npm run db:push && npm run db:seed" to go live.`,
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

/**
 * Tra bàn theo mã QR cho trang /order/t/[code]. Không có fallback tĩnh (khác
 * các getter khác) — bàn là dữ liệu vận hành thực tế, không có ý nghĩa gì để
 * "giả" khi chưa nối Neon, nên trả null thẳng nếu DB chưa cấu hình hoặc lỗi.
 */
export async function getTableByCode(code: string) {
  if (!prisma) return null;
  try {
    const table = await prisma.table.findUnique({ where: { code } });
    if (!table || !table.isActive) return null;
    return table;
  } catch (err) {
    warnFallback("table_by_code", err);
    return null;
  }
}
