import { describe, expect, it } from "vitest";
import { brokerNeutralSymbol, buildTelegramSignalPersistenceValues, deliveryState, formatMockTelegramSignal, formatTelegramLifecycleUpdate, formatTelegramSignal, isConsistentStopLossHit, isLifecycleStageAllowed, resolveBasketClosureReason, isMatchingBasketClosureSignal, parseTelegramLifecycleInput, parseTelegramSignalInput, parseTelegramSignalSourceInput, resolveTelegramSignalEligibility } from "./telegramSignals";

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
    const signal = parseTelegramSignalInput({ ...validSetup, basketId: "basket-230069105-XAUUSD-PERIOD_M1-1787839260" });
    expect(signal).toMatchObject({ direction: "SELL", symbol: "XAUUSD.vx", takeProfit: "4581.83" });
    expect(signal.basketId).toBe("basket-230069105-XAUUSD-PERIOD_M1-1787839260");
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
    expect(buildTelegramSignalPersistenceValues(signal, "message")).toMatchObject({
      eventId: validSetup.eventId,
      basketId: "basket-230069105-XAUUSD-PERIOD_M1-1787839260",
      messageText: "message",
    });
  });

  it("renders every planned entry layer in the setup message", () => {
    const signal = parseTelegramSignalInput({ ...validSetup, entryLayers: [
      { layer: 1, orderType: "LIMIT", price: "4599.20" },
      { layer: 2, orderType: "LIMIT", price: "4597.20" },
      { layer: 3, orderType: "LIMIT", price: "4595.20" },
    ] });
    expect(signal.entryLayers).toHaveLength(3);
    const text = formatTelegramSignal(signal);
    expect(text).toContain("📥 Entry layers: Layer 1 LIMIT @ 4599.20 | Layer 2 LIMIT @ 4597.20 | Layer 3 LIMIT @ 4595.20");
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
    expect(() => parseTelegramSignalInput({ ...validSetup, basketId: "basket id" })).toThrow("basketId is invalid");
    expect(() => parseTelegramSignalInput({ ...validSetup, entryLayers: [{ layer: 1, orderType: "STOP", price: "4599.20" }] })).toThrow("entryLayers[0].orderType is invalid");
    expect(() => parseTelegramLifecycleInput({ eventId: "lifecycle-123456", originalEventId: "signal-123456", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4596.58", triggeredEntryLayer: 0, occurredDate: "2026-08-27", occurredAt: "20:05:00" })).toThrow("triggeredEntryLayer is invalid");
  });

  it("reports the highest confirmed TP milestone as the basket closure reason", () => {
    expect(resolveBasketClosureReason(["TP1"])).toBe("Reason: TP1 reached — all basket positions closed.");
    expect(resolveBasketClosureReason(["TP1", "TP2"])).toBe("Reason: TP2 reached — all basket positions closed.");
    expect(resolveBasketClosureReason(["TP1", "TP2", "TP3"])).toBe("Reason: TP3 reached — all basket positions closed.");
    expect(resolveBasketClosureReason(["SL"])).toBe("Reason: Confirmed basket closure after managed exposure cleared.");
  });

  it("rejects an SL hit that is on the wrong side of the original setup stop-loss", () => {
    expect(isConsistentStopLossHit("SELL", "4581.48", "4593.88")).toBe(false);
    expect(isConsistentStopLossHit("SELL", "4593.88", "4593.88")).toBe(true);
    expect(isConsistentStopLossHit("BUY", "4581.48", "4570.00")).toBe(false);
    expect(isConsistentStopLossHit("BUY", "4569.99", "4570.00")).toBe(true);
    expect(isConsistentStopLossHit("SELL", "4593.88", undefined)).toBe(false);
  });

  it("does not arm automatic publication while configuration is incomplete or the kill switch is engaged", () => {
    expect(deliveryState(undefined)).toMatchObject({ armed: false, state: "not_configured" });
    expect(deliveryState({ channelId: "@fizuxsignal", automaticDeliveryEnabled: "yes", killSwitchEngaged: "yes" })).toMatchObject({ armed: false, state: "kill_switch" });
    expect(deliveryState({ channelId: "@fizuxsignal", automaticDeliveryEnabled: "no", killSwitchEngaged: "no" })).toMatchObject({ armed: false, state: "paused" });
  });

  it("parses and formats display-only TP and SL lifecycle updates", () => {
    const tp = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-tp1-1787819001", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL", hitPrice: "4596.58", positionSetClosed: true, occurredDate: "27-Aug-2026", occurredAt: "20:05:00" });
    const sl = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-sl-1787819002", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "sl_hit", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL", hitPrice: "4603.75", occurredDate: "27-Aug-2026", occurredAt: "20:06:00" });
    expect(tp.stage).toBe("TP1");
    expect(tp.positionSetClosed).toBe(true);
    expect(formatTelegramLifecycleUpdate(tp)).toContain("✅ TP1 HIT (Closed all) 💸");
    expect(formatTelegramLifecycleUpdate(tp)).toContain("Hit price: 4596.58");
    const layeredTp = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-tp1-layer-1787819006", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL", hitPrice: "4596.58", positionSetClosed: false, triggeredEntryLayer: 1, triggeredEntryPrice: "4599.20", cancelledPendingCount: 2, cancellationReason: "TP1 reached; untriggered pending limit orders were cancelled", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" });
    expect(formatTelegramLifecycleUpdate(layeredTp)).toContain("📌 Triggered entry: Layer 1 @ 4599.20");
    expect(formatTelegramLifecycleUpdate(layeredTp)).toContain("🧹 Pending limit orders cancelled: 2 (TP1 reached; untriggered pending limit orders were cancelled)");
    expect(formatTelegramLifecycleUpdate(tp)).toContain("\n📡 Gemini Bot EA Signal update\n");
    expect(formatTelegramLifecycleUpdate(tp)).not.toContain("\\n");
    expect(formatTelegramLifecycleUpdate(tp)).not.toContain("Display update only");
    expect(formatTelegramLifecycleUpdate(tp)).not.toContain("no MT5 order was placed");
    expect(sl.stage).toBe("SL");
    expect(formatTelegramLifecycleUpdate(sl)).toContain("🛑 SL HIT");
    expect(formatTelegramLifecycleUpdate(sl)).not.toContain("Closed all");
    const tp3Open = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-tp3-1787819003", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "tp3_hit", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4589.40", positionSetClosed: false, occurredDate: "27-Aug-2026", occurredAt: "20:10:00" });
    expect(formatTelegramLifecycleUpdate(tp3Open)).toContain("✅ TP3 HIT");
    expect(formatTelegramLifecycleUpdate(tp3Open)).not.toContain("Closed all");
    const basketClosed = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-basket-1787819004", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "basket_closed", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", basketId: "basket-230069105-XAUUSD-PERIOD_M1-1787839260", hitPrice: "4601.89", positionSetClosed: true, occurredDate: "27-Aug-2026", occurredAt: "20:12:00" });
    expect(basketClosed.stage).toBe("BASKET_CLOSED");
    expect(formatTelegramLifecycleUpdate(basketClosed)).toContain("✅ BASKET CLOSED (All basket positions closed) 💸");
    expect(formatTelegramLifecycleUpdate(basketClosed)).toContain("All managed basket positions are closed.");
    const basketCancelled = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-cancel-1787819005", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "basket_cancelled", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", basketId: "basket-230069105-XAUUSD-PERIOD_M1-1787839260", hitPrice: "4610.87", positionSetClosed: false, occurredDate: "27-Aug-2026", occurredAt: "20:13:00" });
    expect(basketCancelled.stage).toBe("BASKET_CANCELLED");
    expect(formatTelegramLifecycleUpdate(basketCancelled)).toContain("⚠️ BASKET PENDING ORDERS CLEARED");
    expect(formatTelegramLifecycleUpdate(basketCancelled)).toContain("Any open position remains managed by the EA.");
    expect(formatTelegramLifecycleUpdate(basketClosed)).not.toContain("Display update only");
    expect(formatTelegramLifecycleUpdate(basketCancelled)).not.toContain("Display update only");
    expect(() => parseTelegramLifecycleInput({ eventId: "bad", originalEventId: "signal-123456", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4596.58", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" })).toThrow("eventId is invalid");
    expect(() => parseTelegramLifecycleInput({ eventId: "lifecycle-123456", originalEventId: "signal-123456", eventType: "tp4_hit", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4596.58", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" })).toThrow("eventType must be tp1_hit, tp2_hit, tp3_hit, sl_hit, basket_closed, or basket_cancelled");
    expect(() => parseTelegramLifecycleInput({ eventId: "lifecycle-123456", originalEventId: "signal-123456", eventType: "basket_closed", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4596.58", positionSetClosed: true, occurredDate: "27-Aug-2026", occurredAt: "20:05:00" })).toThrow("basketId is required for basket outcome events");
    expect(() => parseTelegramLifecycleInput({ eventId: "lifecycle-123456", originalEventId: "signal-123456", eventType: "basket_cancelled", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", basketId: "basket-230069105-XAUUSD-PERIOD_M1-1787839260", hitPrice: "4596.58", positionSetClosed: true, occurredDate: "27-Aug-2026", occurredAt: "20:05:00" })).toThrow("basket_cancelled requires positionSetClosed=false");
    expect(() => parseTelegramLifecycleInput({ eventId: "lifecycle-123456", originalEventId: "signal-123456", eventType: "tp1_hit", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", hitPrice: "4596.58", positionSetClosed: "yes", occurredDate: "27-Aug-2026", occurredAt: "20:05:00" })).toThrow("positionSetClosed must be a boolean when supplied");
  });

  it("enforces lifecycle stage ordering and duplicate protection without blocking an SL report", () => {
    expect(isLifecycleStageAllowed([], "TP1")).toEqual({ allowed: true });
    expect(isLifecycleStageAllowed(["TP1"], "TP1")).toEqual({ allowed: false, reason: "stage_already_recorded" });
    expect(isLifecycleStageAllowed(["TP1", "TP3"], "TP2")).toEqual({ allowed: false, reason: "out_of_order" });
    expect(isLifecycleStageAllowed(["TP1", "TP2", "TP3"], "SL")).toEqual({ allowed: true });
    expect(isLifecycleStageAllowed(["SL"], "SL")).toEqual({ allowed: false, reason: "stage_already_recorded" });
    expect(isLifecycleStageAllowed(["TP1", "TP2"], "BASKET_CLOSED")).toEqual({ allowed: true });
    expect(isLifecycleStageAllowed(["TP1"], "BASKET_CANCELLED")).toEqual({ allowed: true });
  });

  it("matches a basket closure only to delivered setup signals with the exact account, normalized symbol, direction, and basket identity", () => {
    const closure = parseTelegramLifecycleInput({ eventId: "gemini-230069105-XAUUSD-basket-1787819004", originalEventId: "gemini-230069105-XAUUSD-signal-1787839260", eventType: "basket_closed", accountNumber: "230069105", symbol: "XAUUSD", direction: "SELL", basketId: "basket-230069105-XAUUSD-PERIOD_M1-1787839260", hitPrice: "4601.89", positionSetClosed: true, occurredDate: "27-Aug-2026", occurredAt: "20:12:00" });
    const matching = { status: "delivered" as const, telegramMessageId: "123", accountNumber: "230069105", symbol: "XAUUSD.vx", direction: "SELL" as const, basketId: closure.basketId! };
    expect(isMatchingBasketClosureSignal(matching, closure)).toBe(true);
    expect(isMatchingBasketClosureSignal({ ...matching, basketId: "basket-other-1787839260" }, closure)).toBe(false);
    expect(isMatchingBasketClosureSignal({ ...matching, direction: "BUY" }, closure)).toBe(false);
    expect(isMatchingBasketClosureSignal({ ...matching, status: "failed" }, closure)).toBe(false);
    expect(isMatchingBasketClosureSignal({ ...matching, telegramMessageId: null }, closure)).toBe(false);
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
