import { describe, expect, it } from "vitest";
import { derivePerformanceOutcomes, formatPerformanceReport, getPerformanceWindow } from "./telegramPerformanceReports";

describe("Telegram performance reports", () => {
  it("uses the preceding Malaysia day for the 23:59 daily report", () => {
    const window = getPerformanceWindow("daily", new Date("2026-08-28T15:59:00.000Z"));
    expect(window.start.toISOString()).toBe("2026-08-27T16:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-28T16:00:00.000Z");
    expect(window.periodStartDate).toBe("2026-08-28");
    expect(window.label).toBe("28 AUGUST");
  });

  it("treats a callback at 00:01 Malaysia time as the previous completed day", () => {
    const window = getPerformanceWindow("daily", new Date("2026-09-01T16:01:00.000Z"));
    expect(window.start.toISOString()).toBe("2026-08-31T16:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-01T16:00:00.000Z");
    expect(window.periodStartDate).toBe("2026-09-01");
    expect(window.label).toBe("01 SEPTEMBER");
  });

  it("uses the previous Monday-Friday trading week for the 09:00 Monday report", () => {
    const window = getPerformanceWindow("weekly", new Date("2026-08-31T01:00:00.000Z"));
    expect(window.start.toISOString()).toBe("2026-08-23T16:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-28T16:00:00.000Z");
    expect(window.label).toBe("24 AUGUST – 28 AUGUST");
  });

  it("normalizes a 0.54 gold movement to 5.4 project pips and derives terminal outcomes", () => {
    const outcomes = derivePerformanceOutcomes(
      [{ id: 1, symbol: "XAUUSD.vx", direction: "BUY", entryPrice: "4453.76", eaDate: "28-Aug-2026", deliveredAt: new Date() }],
      [{ originalSignalEventId: 1, stage: "TP1", hitPrice: "4454.30", updatedAt: new Date() }],
    );
    expect(outcomes).toEqual([expect.objectContaining({ result: "WIN", pips: 5.4 })]);
  });

  it("formats daily and weekly reports without inventing outcomes", () => {
    const outcomes = [
      { id: 1, symbol: "XAUUSD.vx", direction: "BUY" as const, entryPrice: 4453.76, result: "WIN" as const, pips: 54, occurredDate: "28-Aug-2026" },
      { id: 2, symbol: "XAUUSD.vx", direction: "SELL" as const, entryPrice: 4459.20, result: "LOSS" as const, pips: 10, occurredDate: "28-Aug-2026" },
    ];
    const daily = formatPerformanceReport("daily", outcomes, "28 AUGUST");
    const weekly = formatPerformanceReport("weekly", outcomes, "24 AUGUST – 28 AUGUST");
    expect(daily).toContain("GEMINI QUANT BOT DAILY PERFORMANCE | 28 AUGUST");
    expect(weekly).toContain("GEMINI QUANT BOT WEEKLY PERFORMANCE | 24 AUGUST – 28 AUGUST");
    expect(weekly).toContain("🟢GOLD BUY : +54pips");
    expect(weekly).toContain("🔴GOLD SELL : SL -10pips");
    expect(weekly).toContain("Total : 1 Win, 1 Loss");
    expect(weekly).toContain("Net Pips : 44 Pips");
    expect(weekly).toContain("0 WINSTREAKS ONGOING ✅");
  });
});
