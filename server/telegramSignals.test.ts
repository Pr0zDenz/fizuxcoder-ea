import { describe, expect, it } from "vitest";
import { brokerNeutralSymbol, deliveryState, formatMockTelegramSignal, formatTelegramLifecycleUpdate, formatTelegramSignal, isLifecycleStageAllowed, parseTelegramLifecycleInput, parseTelegramSignalInput, parseTelegramSignalSourceInput, resolveTelegramSignalEligibility } from "./telegramSignals";

describe("Telegram signal contract", () => {
  const validSetup = {
    eventId: "gemini-230069105-XAUUSD-setup-1787819000",
    eventType: "setup",
    accountNumber: "230069105",
    symbol: "XAUUSD.vx",
    direction: "SELL",
    entryPrice: "4599.20",
    takeProfit: "4581.83",
    fiboTp1: "4588.00",
    fiboTp2: "4578.00",
    fiboTp3: "4560.00",
    fiboSlNeg100: "4620.00",
    stopLoss: "4610.00",
    occurredDate: "27-Aug-2026",
    occurredAt: "09:00:00",
  };

  it("accepts a complete setup event and produces a risk-labelled public message", () => {
    const signal = parseTelegramSignalInput(validSetup);
    expect(signal).toMatchObject({ direction: "SELL", symbol: "XAUUSD.vx", takeProfit: "4581.83" });
    expect(formatTelegramSignal(signal)).toContain("⚠️ Automated EA signal for market observation only");
    expect(formatTelegramSignal(signal)).toContain("📊 Symbol: XAUUSD");
    expect(formatTelegramSignal(signal)).toContain("🎯 TP1: 4588.00");
    expect(formatTelegramSignal(signal)).toContain("🎯 TP2: 4578.00");
    expect(formatTelegramSignal(signal)).toContain("🎯 TP3: 4560.00");
    expect(formatTelegramSignal(signal)).toContain("🛡️ SL: 4620.00");
    expect(formatTelegramSignal(signal)).not.toContain("M1 Fibo");
    expect(formatTelegramSignal(signal)).toContain("📡 Gemini Bot EA Signal");
    expect(formatTelegramSignal(signal)).not.toContain("SL (-1.0)");
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
    expect(() => parseTelegramSignalInput({ ...validSetup, fiboTp1: "not-a-price" })).toThrow("fiboTp1 must be a numeric value");
    expect(() => parseTelegramSignalInput({ ...validSetup, fiboSlNeg100: "not-a-price" })).toThrow("fiboSlNeg100 must be a numeric value");
    expect(() => parseTelegramSignalInput({ ...validSetup, occurredDate: "2026-08-27" })).toThrow("occurredDate must use DD-MMM-YYYY format");
    expect(() => parseTelegramSignalInput({ ...validSetup, occurredAt: "2026-08-27T01:00:00.000Z" })).toThrow("occurredAt must use 24-hour HH:mm:ss format");
  });

  it("does not arm automatic publication while configuration is incomplete or the kill switch is engaged", () => {
    expect(deliveryState(undefined)).toMatchObject({ armed: false, state: "not_configured" });
    expect(deliveryState({ channelId: "@fizuxsignal", automaticDeliveryEnabled: "yes", killSwitchEngaged: "yes" })).toMatchObject({ armed: false, state: "kill_switch" });
    expect(deliveryState({ channelId: "@fizuxsignal", automaticDeliveryEnabled: "no", killSwitchEngaged: "no" })).toMatchObject({ armed: false, state: "paused" });
  });

  it("parses and formats display-only TP and SL lifecycle updates", () => {
    const tp = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-tp1-1787819001", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL", hitPrice: "4596.58", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" });
    const sl = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-sl-1787819002", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "sl_hit", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL", hitPrice: "4603.75", occurredDate: "27-Aug-2026", occurredAt: "20:06:00" });
    expect(tp.stage).toBe("TP1");
    expect(formatTelegramLifecycleUpdate(tp)).toContain("✅ TP1 HIT");
    expect(formatTelegramLifecycleUpdate(tp)).toContain("Hit price: 4596.58");
    expect(formatTelegramLifecycleUpdate(tp)).toContain("\n📡 Gemini Bot EA Signal update\n");
    expect(formatTelegramLifecycleUpdate(tp)).not.toContain("\\n");
    expect(formatTelegramLifecycleUpdate(tp)).toContain("Display update only");
    expect(sl.stage).toBe("SL");
    expect(formatTelegramLifecycleUpdate(sl)).toContain("🛑 SL HIT");
    expect(() => parseTelegramLifecycleInput({ eventId: "bad", originalEventId: "signal-123456", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4596.58", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" })).toThrow("eventId is invalid");
    expect(() => parseTelegramLifecycleInput({ eventId: "lifecycle-123456", originalEventId: "signal-123456", eventType: "tp4_hit", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4596.58", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" })).toThrow("eventType must be tp1_hit, tp2_hit, tp3_hit, or sl_hit");
  });

  it("enforces lifecycle stage ordering and duplicate protection without blocking an SL report", () => {
    expect(isLifecycleStageAllowed([], "TP1")).toEqual({ allowed: true });
    expect(isLifecycleStageAllowed(["TP1"], "TP1")).toEqual({ allowed: false, reason: "stage_already_recorded" });
    expect(isLifecycleStageAllowed(["TP1", "TP3"], "TP2")).toEqual({ allowed: false, reason: "out_of_order" });
    expect(isLifecycleStageAllowed(["TP1", "TP2", "TP3"], "SL")).toEqual({ allowed: true });
    expect(isLifecycleStageAllowed(["SL"], "SL")).toEqual({ allowed: false, reason: "stage_already_recorded" });
  });

  it("validates an owner-approved source without granting customer entitlement data", () => {
    expect(parseTelegramSignalSourceInput({ accountNumber: "230069105", label: "Admin demo account", active: true })).toEqual({ accountNumber: "230069105", label: "Admin demo account", active: true });
    expect(() => parseTelegramSignalSourceInput({ accountNumber: "account-x", label: "Admin demo account", active: true })).toThrow("Enter a valid numeric MT5 account number");
    expect(() => parseTelegramSignalSourceInput({ accountNumber: "230069105", label: " ", active: true })).toThrow("Enter a label for this internal signal source");
  });

  it("permits an active customer entitlement or enabled internal source, but rejects disabled or unknown sources", () => {
    expect(resolveTelegramSignalEligibility({ hasActiveCustomerEntitlement: true, hasEnabledInternalSource: false })).toEqual({ eligible: true, origin: "customer_entitlement" });
    expect(resolveTelegramSignalEligibility({ hasActiveCustomerEntitlement: false, hasEnabledInternalSource: true })).toEqual({ eligible: true, origin: "owner_approved_internal_source" });
    expect(resolveTelegramSignalEligibility({ hasActiveCustomerEntitlement: false, hasEnabledInternalSource: false })).toEqual({ eligible: false, origin: "none" });
  });
});
