import type { Express, Request, Response } from "express";
import { validSecret } from "./geminiEventIntakeRoute";
import { parseTelegramSignalInput, receiveTelegramSignal } from "./telegramSignals";

export function registerTelegramSignalRoute(app: Express) {
  app.get("/api/telegram/signals/gemini/ping", (req: Request, res: Response) => {
    if (!validSecret(req.header("X-Gemini-Event-Key"))) return res.status(401).json({ ok: false, error: "Unauthorized" });
    return res.json({ ok: true, service: "telegram-signal-intake", accepts: "validated_setup_events" });
  });

  app.post("/api/telegram/signals/gemini", async (req: Request, res: Response) => {
    if (!validSecret(req.header("X-Gemini-Event-Key"))) return res.status(401).json({ ok: false, error: "Unauthorized" });
    try {
      const signal = parseTelegramSignalInput((req.body ?? {}) as Record<string, unknown>);
      const result = await receiveTelegramSignal(signal);
      return res.status(result.created ? 201 : 200).json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process Telegram signal";
      return res.status(400).json({ ok: false, error: message.slice(0, 180) });
    }
  });
}
