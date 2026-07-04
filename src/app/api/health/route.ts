import { ok, withErrorHandling } from "@/lib/api";
import { prisma } from "@/lib/prisma";

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
