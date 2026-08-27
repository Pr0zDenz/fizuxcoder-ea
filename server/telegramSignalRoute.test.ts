import { describe, expect, it, vi } from "vitest";

const { receiveTelegramSignalMock, receiveTelegramLifecycleMock } = vi.hoisted(() => ({ receiveTelegramSignalMock: vi.fn(), receiveTelegramLifecycleMock: vi.fn() }));
vi.mock("./geminiEventIntakeRoute", () => ({ validSecret: vi.fn(() => false) }));
vi.mock("./telegramSignals", () => ({ parseTelegramLifecycleInput: vi.fn(), parseTelegramSignalInput: vi.fn(), receiveTelegramLifecycleUpdate: receiveTelegramLifecycleMock, receiveTelegramSignal: receiveTelegramSignalMock }));

import { validSecret } from "./geminiEventIntakeRoute";
import { parseTelegramLifecycleInput, parseTelegramSignalInput } from "./telegramSignals";
import { registerTelegramSignalRoute } from "./telegramSignalRoute";

function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("Telegram signal intake route", () => {
  it("registers only the private signal endpoint and rejects a missing event key", async () => {
    let postHandler: ((req: any, res: any) => Promise<unknown>) | undefined;
    const app = { get: vi.fn(), post: vi.fn((_path: string, handler: typeof postHandler) => { postHandler = handler; }) };
    registerTelegramSignalRoute(app as never);
    expect(app.get).toHaveBeenCalledWith("/api/telegram/signals/gemini/ping", expect.any(Function));
    expect(app.post).toHaveBeenCalledWith("/api/telegram/signals/gemini", expect.any(Function));

    const res = response();
    await postHandler!({ header: () => undefined, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(receiveTelegramSignalMock).not.toHaveBeenCalled();
  });

  it("returns a validation error without delivery when a signed request payload is incomplete", async () => {
    vi.mocked(validSecret).mockReturnValueOnce(true);
    vi.mocked(parseTelegramSignalInput).mockImplementationOnce(() => { throw new Error("direction must be BUY or SELL"); });
    const app = { get: vi.fn(), post: vi.fn() };
    registerTelegramSignalRoute(app as never);
    const handler = app.post.mock.calls[0][1];
    const res = response();
    await handler({ header: () => "valid-key", body: { eventId: "bad" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "direction must be BUY or SELL" });
    expect(receiveTelegramSignalMock).not.toHaveBeenCalled();
  });

  it("dispatches an authenticated lifecycle hit update without exposing the ingest key", async () => {
    const parsed = { eventId: "signal-tp1-123456", originalEventId: "signal-123456", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL", stage: "TP1", hitPrice: "4596.58", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" };
    vi.mocked(validSecret).mockReturnValueOnce(true);
    vi.mocked(parseTelegramLifecycleInput).mockReturnValueOnce(parsed as never);
    receiveTelegramLifecycleMock.mockResolvedValueOnce({ created: true, id: 10, status: "delivered", delivered: true, replyMessageId: "99" });
    const app = { get: vi.fn(), post: vi.fn() };
    registerTelegramSignalRoute(app as never);
    const handler = app.post.mock.calls[0][1];
    const res = response();
    await handler({ header: () => "valid-key", body: { ...parsed, "X-Gemini-Event-Key": "must-not-forward" } }, res);
    expect(parseTelegramLifecycleInput).toHaveBeenCalledWith(expect.objectContaining({ eventType: "tp1_hit", originalEventId: "signal-123456", hitPrice: "4596.58" }));
    expect(receiveTelegramLifecycleMock).toHaveBeenCalledWith(parsed);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true, created: true, id: 10, status: "delivered", delivered: true, replyMessageId: "99" });
  });

  it("forwards validated optional M1 Fibonacci TP and −1.0 stop-reference fields without exposing the ingest key", async () => {
    const parsed = { eventId: "signal-123456", eventType: "setup", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL", entryPrice: "4588.21", fiboTp1: "4580.00", fiboTp2: "4570.00", fiboTp3: "4550.00", fiboSlNeg100: "4610.00", occurredDate: "27-Aug-2026", occurredAt: "14:01:00" };
    vi.mocked(validSecret).mockReturnValueOnce(true);
    vi.mocked(parseTelegramSignalInput).mockReturnValueOnce(parsed as never);
    receiveTelegramSignalMock.mockResolvedValueOnce({ created: true, id: 1, status: "suppressed", delivered: false });
    const app = { get: vi.fn(), post: vi.fn() };
    registerTelegramSignalRoute(app as never);
    const handler = app.post.mock.calls[0][1];
    const res = response();
    await handler({ header: () => "valid-key", body: { ...parsed, ignored: "not forwarded" } }, res);
    expect(parseTelegramSignalInput).toHaveBeenCalledWith(expect.objectContaining({ fiboTp1: "4580.00", fiboTp2: "4570.00", fiboTp3: "4550.00", fiboSlNeg100: "4610.00" }));
    expect(receiveTelegramSignalMock).toHaveBeenCalledWith(parsed);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
