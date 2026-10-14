import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * The single "current" academic session.
 *
 * This lookup was copy-pasted into ~30 pages/actions, sometimes twice in the
 * same request (e.g. admin/students). Centralising it gives one place to
 * change the rule and React cache() dedupes repeat calls within a request.
 *
 * Selects a superset ({ id, label }) of what every caller previously used.
 */
export const getCurrentSession = cache(async () => {
  return prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  });
});
