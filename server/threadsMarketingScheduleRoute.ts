import type { Express } from "express";
import { sdk } from "./_core/sdk";
import { runScheduledThreadsMarketing } from "./threadsMarketingAutomation";

/**
 * Heartbeat-only endpoint. It never accepts a task ID, owner ID, post body, or
 * content ID from the caller; the verified cron identity is the sole lookup key.
 */
export function registerThreadsMarketingScheduleRoute(app: Express) {
  app.post("/api/scheduled/threads-marketing", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        res.status(403).json({ ok: false, error: "Cron authentication is required" });
        return;
      }
      const result = await runScheduledThreadsMarketing(user.taskUid);
      res.status(result.ok ? 200 : 502).json(result);
    } catch (error) {
      console.error("[Threads marketing schedule] callback failed", error);
      res.status(500).json({ ok: false, error: "Scheduled Threads marketing callback failed safely" });
    }
  });
}
