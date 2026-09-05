import { ok, withErrorHandling } from "@/lib/api";
import { getCloudClient } from "@cbd/database";

const prisma = getCloudClient();

export const dynamic = "force-dynamic";

// GET /api/health — quick check of whether Neon is reachable.
export const GET = withErrorHandling(async () => {
  if (!prisma) {
    return ok({ db: "unconfigured" }, 200);
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ db: "connected" });
  } catch {
    return ok({ db: "unreachable" }, 200);
  }
});
