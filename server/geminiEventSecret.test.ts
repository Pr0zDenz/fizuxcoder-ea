import { describe, expect, it, vi } from "vitest";

const { getUserByOpenIdMock, createDraftMock } = vi.hoisted(() => ({ getUserByOpenIdMock: vi.fn(), createDraftMock: vi.fn() }));
vi.mock("./db", () => ({ getUserByOpenId: getUserByOpenIdMock }));
vi.mock("./marketingStudio", () => ({ createGeminiVpsEventDraft: createDraftMock }));

import { beforeEach } from "vitest";
import { registerGeminiEventIntakeRoute } from "./geminiEventIntakeRoute";

function handlerFor() {
  let handler: (req: any, res: any) => Promise<unknown>;
  const app = { get: vi.fn(), post: vi.fn((_path: string, registered: typeof handler) => { handler = registered; }) };
  registerGeminiEventIntakeRoute(app as never);
  return { app, handler: handler! };
}

function response() {
  const res: any = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("dedicated Gemini event ingest secret", () => {
  beforeEach(() => {
    getUserByOpenIdMock.mockReset();
    createDraftMock.mockReset();
  });
  it("accepts an authenticated TP2 screenshot event as a draft-only owner action", async () => {
    const key = process.env.GEMINI_EVENT_INGEST_KEY;
    expect(key).toBeTruthy();
    getUserByOpenIdMock.mockResolvedValue({ id: 1, role: "admin" });
    createDraftMock.mockResolvedValue({ created: true, contentItemId: 77, status: "draft", assetUrl: "/manus-storage/tp2.png" });
    const { handler } = handlerFor();
    const res = response();
    const req = {
      header: (name: string) => name === "X-Gemini-Event-Key" ? key : undefined,
      body: { eventId: "gemini-tp2-test", eventType: "tp2_hit", screenshotBase64: Buffer.from("89504e470d0a1a0a", "hex").toString("base64"), screenshotMimeType: "image/png", symbol: "XAUUSD" },
    };

    await handler(req, res);

    expect(createDraftMock).toHaveBeenCalledWith(expect.objectContaining({ eventId: "gemini-tp2-test", eventType: "tp2_hit", actorUserId: 1 }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, status: "draft", hasImage: true }));
  });

  it("authenticates the lightweight intake endpoint with GEMINI_EVENT_INGEST_KEY and never the licensing header", async () => {
    const key = process.env.GEMINI_EVENT_INGEST_KEY;
    expect(key).toBeTruthy();
    const { app, handler } = handlerFor();
    const res = response();
    const req = { header: (name: string) => name === "X-Gemini-Event-Key" ? key : undefined, body: {} };

    await handler(req, res);

    expect(app.post).toHaveBeenCalledWith("/api/threads/gemini-event", expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    expect(getUserByOpenIdMock).not.toHaveBeenCalled();
    expect(createDraftMock).not.toHaveBeenCalled();
  });
});
