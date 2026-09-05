import { getCloudClient } from "@cbd/database";

const prisma = getCloudClient();

/**
 * Gọi sau MỌI thay đổi menu/knowledge/system-prompt để pos-local biết có
 * config mới cần pull (xem GET /api/sync/config?since=). Best-effort — lỗi
 * ghi version không nên chặn thao tác admin đang thực hiện.
 */
export async function bumpConfigVersion(): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.configVersion.upsert({
      where: { id: "singleton" },
      update: { version: { increment: 1 } },
      create: { id: "singleton", version: 1 },
    });
  } catch (err) {
    console.warn("[config-version] Không bump được configVersion:", err instanceof Error ? err.message : err);
  }
}
