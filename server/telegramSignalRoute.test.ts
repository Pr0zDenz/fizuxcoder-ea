import { describe, expect, it, vi } from "vitest";

const { receiveTelegramSignalMock } = vi.hoisted(() => ({ receiveTelegramSignalMock: vi.fn() }));
vi.mock("./geminiEventIntakeRoute", () => ({ validSecret: vi.fn(() => false) }));
vi.mock("./telegramSignals", () => ({ parseTelegramSignalInput: vi.fn(), receiveTelegramSignal: receiveTelegramSignalMock }));

import { validSecret } from "./geminiEventIntakeRoute";
import { parseTelegramSignalInput } from "./telegramSignals";
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
});
