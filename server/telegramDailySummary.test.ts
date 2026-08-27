import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const { getDbMock, sendTelegramMessageMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), sendTelegramMessageMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./telegramSignals", () => ({
  brokerNeutralSymbol: (symbol: string) => symbol.split(/[._-]/, 1)[0] || symbol,
  getTelegramDailySummaryDestination: vi.fn(),
  sendTelegramMessage: sendTelegramMessageMock,
}));

import { DAILY_SUMMARY_CRON, formatTelegramDailySummary, getDailySummaryWindow, runTelegramDailySummary } from "./telegramDailySummary";

const routeSource = readFileSync(new URL("./telegramDailySummaryRoute.ts", import.meta.url), "utf8");

function nestedSelect(rows: unknown[]) {
  return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })) })) };
}

describe("midnight Telegram daily signal summary", () => {
  it("uses the requested 00:00 GMT+8 time as a six-field UTC cron", () => {
    expect(DAILY_SUMMARY_CRON).toBe("0 0 16 * * *");
  });

  it("summarizes the completed Malaysia calendar day rather than the first minutes of the new day", () => {
    const window = getDailySummaryWindow(new Date("2026-08-29T16:00:00.000Z"));
    expect(window.summaryDate).toBe("29-Aug-2026");
    expect(window.start.toISOString()).toBe("2026-08-28T16:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-29T16:00:00.000Z");
  });

  it("formats factual delivered setup and lifecycle counts without account, price, or profitability claims", () => {
    const text = formatTelegramDailySummary({
      summaryDate: "28-Aug-2026",
      setups: [{ id: 7, symbol: "XAUUSD.vx", direction: "SELL" }],
      lifecycleUpdates: [{ originalSignalEventId: 7, stage: "TP1" }, { originalSignalEventId: 7, stage: "SL" }, { originalSignalEventId: 7, stage: "BASKET_CLOSED" }],
    });
    expect(text).toContain("📡 Gemini Bot EA — Daily Signal Summary");
    expect(text).toContain("📅 Trading day: 28-Aug-2026 (GMT+8)");
    expect(text).toContain("• XAUUSD SELL — TP1, SL, BASKET_CLOSED");
    expect(text).toContain("✅ TP lifecycle updates: 1");
    expect(text).toContain("💼 Confirmed basket-closure updates: 1");
    expect(text).toContain("Summary of channel notifications only, not a performance statement or forecast.");
    expect(text).not.toMatch(/230069105|profit|guaranteed/i);
  });

  it("does not send a message while the independent daily-summary kill switch remains engaged", async () => {
    const settings = { settingKey: "owner_daily_telegram_summary", ownerUserId: 1, automaticDeliveryEnabled: "no", killSwitchEngaged: "yes", scheduleCronTaskUid: "daily-cron-1" };
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    const db = {
      select: vi.fn(() => nestedSelect([settings])),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    getDbMock.mockResolvedValue(db);

    await expect(runTelegramDailySummary("daily-cron-1", new Date("2026-08-29T16:00:00.000Z"))).resolves.toEqual({ ok: true, skipped: "paused" });
    expect(sendTelegramMessageMock).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ action: "run_skipped" }));
  });

  it("records a no-signal skip without posting when the owner retains the default empty-day policy", async () => {
    const settings = { settingKey: "owner_daily_telegram_summary", ownerUserId: 1, automaticDeliveryEnabled: "yes", killSwitchEngaged: "no", sendWhenNoSignals: "no", scheduleCronTaskUid: "daily-cron-1" };
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 12 }]);
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(nestedSelect([settings]))
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })) })) })
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })) })) }),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    getDbMock.mockResolvedValue(db);

    await expect(runTelegramDailySummary("daily-cron-1", new Date("2026-08-29T16:00:00.000Z"))).resolves.toEqual({ ok: true, skipped: "no_signals", summaryDate: "29-Aug-2026" });
    expect(sendTelegramMessageMock).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ action: "run_skipped", note: expect.stringContaining("no-message policy") }));
  });

  it("requires a verified cron identity and task UID at the HTTP boundary", () => {
    expect(routeSource).toContain("sdk.authenticateRequest(req)");
    expect(routeSource).toContain("!user.isCron || !user.taskUid");
    expect(routeSource).not.toContain("req.body");
    expect(routeSource).toContain("context: { url: req.originalUrl, taskUid: taskUid ?? null }");
  });
});
