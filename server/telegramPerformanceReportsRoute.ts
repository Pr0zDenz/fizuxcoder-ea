import type { Express } from "express";
import { sdk } from "./_core/sdk";
import { runTelegramPerformanceReportByTask } from "./telegramPerformanceReports";

export function registerTelegramPerformanceReportsRoute(app: Express) {
  app.post("/api/scheduled/telegram-performance-report", async (req, res) => {
    let taskUid: string | undefined;
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        res.status(403).json({ ok: false, error: "Cron authentication is required" });
        return;
      }
      taskUid = user.taskUid;
      const result = await runTelegramPerformanceReportByTask(taskUid);
      res.status(200).json(result);
    } catch (error) {
      console.error("[Telegram performance report] callback failed", error);
      res.status(500).json({
        ok: false,
        error: "Telegram performance report callback failed safely",
        stack: error instanceof Error ? error.stack?.slice(0, 2_000) : undefined,
        context: { url: req.originalUrl, taskUid: taskUid ?? null },
        timestamp: new Date().toISOString(),
      });
    }
  });
}
