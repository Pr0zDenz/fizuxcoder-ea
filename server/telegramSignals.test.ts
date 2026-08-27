import { describe, expect, it } from "vitest";
import { brokerNeutralSymbol, deliveryState, formatMockTelegramSignal, formatTelegramSignal, parseTelegramSignalInput } from "./telegramSignals";

describe("Telegram signal contract", () => {
  const validSetup = {
    eventId: "gemini-230069105-XAUUSD-setup-1787819000",
    eventType: "setup",
    accountNumber: "230069105",
    symbol: "XAUUSD.vx",
    direction: "SELL",
    entryPrice: "4599.20",
    takeProfit: "4581.83",
    stopLoss: "4610.00",
    occurredDate: "27-Aug-2026",
    occurredAt: "09:00:00",
  };

  it("accepts a complete setup event and produces a risk-labelled public message", () => {
    const signal = parseTelegramSignalInput(validSetup);
    expect(signal).toMatchObject({ direction: "SELL", symbol: "XAUUSD.vx", takeProfit: "4581.83" });
    expect(formatTelegramSignal(signal)).toContain("⚠️ Automated EA signal for market observation only");
    expect(formatTelegramSignal(signal)).toContain("📊 Symbol: XAUUSD");
    expect(formatTelegramSignal(signal)).toContain("Safe TP: 4581.83");
    expect(formatTelegramSignal(signal)).toContain("📅 Event Date: 27-Aug-2026");
    expect(formatTelegramSignal(signal)).toContain("🕒 Event Time: 09:00:00 GMT+8");
    expect(brokerNeutralSymbol("XAUUSD.vx")).toBe("XAUUSD");
  });

  it("labels the owner-only mock event as non-trading while preserving the EA clock time", () => {
    const signal = parseTelegramSignalInput(validSetup);
    const text = formatMockTelegramSignal(signal);
    expect(text).toContain("EA SIGNAL MOCK TEST — NOT FOR TRADING");
    expect(text).toContain("📅 Event Date: 27-Aug-2026");
    expect(text).toContain("🕒 Event Time: 09:00:00 GMT+8");
    expect(text).toContain("no MT5 order, licence, or account configuration was changed");
  });

  it("rejects event data that cannot be used as an actionable signal", () => {
    expect(() => parseTelegramSignalInput({ ...validSetup, eventId: "bad id" })).toThrow("eventId is invalid");
    expect(() => parseTelegramSignalInput({ ...validSetup, direction: "HOLD" })).toThrow("direction must be BUY or SELL");
    expect(() => parseTelegramSignalInput({ ...validSetup, entryPrice: "market" })).toThrow("entryPrice must be a numeric value");
    expect(() => parseTelegramSignalInput({ ...validSetup, occurredDate: "2026-08-27" })).toThrow("occurredDate must use DD-MMM-YYYY format");
    expect(() => parseTelegramSignalInput({ ...validSetup, occurredAt: "2026-08-27T01:00:00.000Z" })).toThrow("occurredAt must use 24-hour HH:mm:ss format");
  });

  it("does not arm automatic publication while configuration is incomplete or the kill switch is engaged", () => {
    expect(deliveryState(undefined)).toMatchObject({ armed: false, state: "not_configured" });
    expect(deliveryState({ channelId: "@fizuxsignal", automaticDeliveryEnabled: "yes", killSwitchEngaged: "yes" })).toMatchObject({ armed: false, state: "kill_switch" });
    expect(deliveryState({ channelId: "@fizuxsignal", automaticDeliveryEnabled: "no", killSwitchEngaged: "no" })).toMatchObject({ armed: false, state: "paused" });
  });
});
