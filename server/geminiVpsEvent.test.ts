import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock, storagePutMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), storagePutMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./storage", () => ({ storagePut: storagePutMock }));
vi.mock("./threadsPublisher", () => ({ publishThreadsPost: vi.fn(), ThreadsPublishError: class ThreadsPublishError extends Error {} }));

import { createGeminiVpsEventDraft, GEMINI_EVENT_PORTAL_URL, MARKETING_RISK_NOTICE } from "./marketingStudio";

function dbWith({ existing = [], insertIds = [321, 654] }: { existing?: Array<{ id: number; status: string }>; insertIds?: number[] } = {}) {
  const values = vi.fn();
  let call = 0;
  values.mockImplementation(async () => [{ insertId: insertIds[call++] }]);
  const db = {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(existing) })) })) })),
    insert: vi.fn(() => ({ values })),
  };
  getDbMock.mockResolvedValue(db);
  return { db, values };
}

describe("Gemini VPS event draft intake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storagePutMock.mockResolvedValue({ key: "threads/gemini-vps-events/e1.png", url: "/manus-storage/threads/gemini-vps-events/e1.png" });
  });

  it("stores one screenshot and creates an evergreen approval-required draft", async () => {
    const { db, values } = dbWith();
    const result = await createGeminiVpsEventDraft({ eventId: "e1", eventType: "take_profit", screenshot: Buffer.from("png"), screenshotMimeType: "image/png", occurredAt: "2026-08-25T10:00:00.000Z", symbol: "XAUUSD", profitAmount: 47.1, actorUserId: 7 });

    expect(result).toEqual({ created: true, contentItemId: 321, status: "draft", assetUrl: "/manus-storage/threads/gemini-vps-events/e1.png" });
    expect(storagePutMock).toHaveBeenCalledWith("threads/gemini-vps-events/e1.png", expect.any(Buffer), "image/png");
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", scheduledFor: null, destinationUrl: GEMINI_EVENT_PORTAL_URL, riskNotice: MARKETING_RISK_NOTICE, assetUrl: "/manus-storage/threads/gemini-vps-events/e1.png" }));
    expect(values.mock.calls[0][0].caption).toContain("not a promise or forecast");
    expect(values.mock.calls[0][0].caption).toContain(GEMINI_EVENT_PORTAL_URL);
    expect(values.mock.calls[1][0]).toEqual(expect.objectContaining({ action: "revised", actorUserId: 7 }));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("does not upload or create a duplicate draft for the same event id", async () => {
    const { db, values } = dbWith({ existing: [{ id: 321, status: "draft" }] });
    await expect(createGeminiVpsEventDraft({ eventId: "e1", eventType: "setup", screenshot: Buffer.from("png"), screenshotMimeType: "image/png", actorUserId: 7 })).resolves.toEqual({ created: false, contentItemId: 321, status: "draft" });
    expect(storagePutMock).not.toHaveBeenCalled();
    expect(values).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
