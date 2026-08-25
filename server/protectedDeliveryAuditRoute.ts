import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { protectedDeliveryAuditSchedules } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { currentAuditCycleKey, runProtectedDeliveryAudit, PROTECTED_DELIVERY_AUDIT_PATH } from "./protectedDeliveryAudit";

export function registerProtectedDeliveryAuditRoute(app: Express): void {
  app.post(PROTECTED_DELIVERY_AUDIT_PATH, async (req: Request, res: Response) => {
    let taskUid: string | undefined;
    try {
      const user = await sdk.authenticateRequest(req);
      taskUid = user.taskUid;
      if (!user.isCron || !taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database is unavailable for the protected-delivery audit.");
      const schedule = (await db.select({ id: protectedDeliveryAuditSchedules.id })
        .from(protectedDeliveryAuditSchedules)
        .where(eq(protectedDeliveryAuditSchedules.scheduleCronTaskUid, taskUid))
        .limit(1))[0];
      if (!schedule) return res.json({ ok: true, skipped: "orphan" });

      const result = await runProtectedDeliveryAudit(schedule.id, currentAuditCycleKey());
      return res.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scheduled audit failure.";
      return res.status(500).json({
        error: "protected-delivery-audit-failed",
        detail: message,
        stack: error instanceof Error ? error.stack : undefined,
        context: { url: req.originalUrl, taskUid: taskUid ?? null },
        timestamp: new Date().toISOString(),
      });
    }
  });
}
