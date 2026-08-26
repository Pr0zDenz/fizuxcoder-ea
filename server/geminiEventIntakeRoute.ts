import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";
import { getUserByOpenId, upsertUser } from "./db";
import { createGeminiVpsEventDraft } from "./marketingStudio";

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validSecret(received: string | undefined) {
  const expected = ENV.geminiEventIngestKey;
  if (!received || !expected) return false;
  const actualBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function decodeScreenshot(value: unknown, mimeType: unknown) {
  if (typeof value !== "string" || typeof mimeType !== "string" || !MIME_TYPES.has(mimeType)) throw new Error("screenshotBase64 and a supported screenshotMimeType are required");
  const raw = value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new Error("screenshotBase64 is invalid");
  const data = Buffer.from(raw, "base64");
  if (!data.length || data.length > MAX_SCREENSHOT_BYTES) throw new Error("Screenshot exceeds the 8 MB limit");
  const validMagic = mimeType === "image/png" ? data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) : mimeType === "image/jpeg" ? data.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")) : data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
  if (!validMagic) throw new Error("Screenshot bytes do not match the declared image type");
  return data;
}

export async function getOwnerAuditIdentity() {
  const ownerOpenId = ENV.ownerOpenId.trim();
  if (!ownerOpenId) return undefined;

  let owner = await getUserByOpenId(ownerOpenId);
  if (!owner || owner.role !== "admin") {
    await upsertUser({ openId: ownerOpenId, name: process.env.OWNER_NAME ?? "FizuxCoder owner", role: "admin" });
    owner = await getUserByOpenId(ownerOpenId);
  }
  return owner?.role === "admin" ? owner : undefined;
}

export function registerGeminiEventIntakeRoute(app: Express) {
  app.get("/api/threads/gemini-event/ping", (req: Request, res: Response) => {
    if (!validSecret(req.header("X-Gemini-Event-Key"))) return res.status(401).json({ ok: false, error: "Unauthorized" });
    return res.json({ ok: true, service: "gemini-event-intake", draftOnly: true });
  });

  app.post("/api/threads/gemini-event", async (req: Request, res: Response) => {
    if (!validSecret(req.header("X-Gemini-Event-Key"))) return res.status(401).json({ ok: false, error: "Unauthorized" });
    try {
      const body = req.body as Record<string, unknown>;
      const eventId = typeof body.eventId === "string" ? body.eventId : "";
      const eventType = body.eventType === "setup" || body.eventType === "take_profit" ? body.eventType : null;
      if (!eventId || !eventType) return res.status(400).json({ ok: false, error: "eventId and eventType are required" });
      const screenshot = decodeScreenshot(body.screenshotBase64, body.screenshotMimeType);
      const owner = await getOwnerAuditIdentity();
      if (!owner || owner.role !== "admin") return res.status(503).json({ ok: false, error: "Owner audit identity is unavailable" });
      const result = await createGeminiVpsEventDraft({ eventId, eventType, screenshot, screenshotMimeType: body.screenshotMimeType as "image/png" | "image/jpeg" | "image/webp", occurredAt: typeof body.occurredAt === "string" ? body.occurredAt : undefined, accountLabel: typeof body.accountLabel === "string" ? body.accountLabel : undefined, symbol: typeof body.symbol === "string" ? body.symbol : undefined, profitAmount: typeof body.profitAmount === "number" ? body.profitAmount : undefined, actorUserId: owner.id });
      return res.status(result.created ? 201 : 200).json({ ok: true, created: result.created, contentItemId: result.contentItemId, status: result.status, hasImage: Boolean(result.assetUrl) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create event draft";
      return res.status(400).json({ ok: false, error: message.slice(0, 180) });
    }
  });
}
