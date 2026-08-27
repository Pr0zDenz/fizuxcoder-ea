import { describe, expect, it } from "vitest";
import { brokerNeutralSymbol, deliveryState, formatMockTelegramSignal, formatTelegramSignal, parseTelegramSignalInput, parseTelegramSignalSourceInput, resolveTelegramSignalEligibility } from "./telegramSignals";

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
    expect(formatTelegramSignal(signal)).toContain("🎯 M1 Fibo TP1: 4588.00");
    expect(formatTelegramSignal(signal)).toContain("🎯 M1 Fibo TP2: 4578.00");
    expect(formatTelegramSignal(signal)).toContain("🎯 M1 Fibo TP3: 4560.00");
    expect(formatTelegramSignal(signal)).toContain("🛡️ M1 Fibo SL (-1.0): 4620.00");
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
