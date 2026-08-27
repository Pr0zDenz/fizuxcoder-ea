import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const sourceUrl = new URL("../docs/release-records/mql5/GeminiBotEAv11.97_NewLook_TelegramEnabled_ClosureAware.mq5", import.meta.url);

describe("Gemini Telegram closure-aware MQL5 release", () => {
  it("reports a boolean observed closure state in TP lifecycle payloads", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain("bool SendTelegramLifecycleUpdate(string event_type, int stage, double hit_price, bool position_set_closed, datetime event_time)");
    expect(source).toContain('",\\\"positionSetClosed\\\":" + (position_set_closed ? "true" : "false")');
    expect(source).toContain("bool position_set_closed = !HasManagedOpenPosition();");
    expect(source).toContain('SendTelegramLifecycleUpdate("tp1_hit", 1, locked_fibo_tp1, position_set_closed, now)');
    expect(source).toContain('SendTelegramLifecycleUpdate("tp3_hit", 3, locked_fibo_tp3, position_set_closed, now)');
  });

  it("keeps the closure observer separate from order modification and closure", async () => {
    const source = await readFile(sourceUrl, "utf8");
    const observer = source.slice(source.indexOf("bool HasManagedOpenPosition()"), source.indexOf("void PersistTelegramLifecycleState"));
    expect(observer).toContain("if(posInfo.SelectByIndex(i) && IsManagedPosition()) return true;");
    expect(observer).not.toContain("trade.PositionClose");
    expect(observer).not.toContain("trade.PositionModify");
    expect(observer).not.toContain("trade.OrderDelete");
  });

  it("uses one explicit basket identity and reports closure before the existing lifecycle state reset", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain('\\"basketId\\":\\"" + JsonEscape(basket_id)');
    expect(source).toContain('bool ReportTelegramBasketClosure(datetime event_time)');
    expect(source).toContain('SendTelegramLifecycleUpdate("basket_closed", 5, observed_price, true, event_time)');
    expect(source).toContain("if(stage == 5) telegram_basket_closed_reported = true;");
    const noActiveTradesBranch = source.indexOf("if(!has_active_trades)");
    const basketClosureCall = source.indexOf("ReportTelegramBasketClosure(TimeCurrent());", noActiveTradesBranch);
    const resetAfterClosure = source.indexOf("ClearTelegramLifecycleState();", basketClosureCall);
    expect(basketClosureCall).toBeGreaterThan(noActiveTradesBranch);
    expect(basketClosureCall).toBeLessThan(resetAfterClosure);
    const reporter = source.slice(source.indexOf("bool ReportTelegramBasketClosure"), source.indexOf("void MonitorTelegramLifecycle"));
    expect(reporter).not.toContain("trade.PositionClose");
    expect(reporter).not.toContain("trade.PositionModify");
    expect(reporter).not.toContain("trade.OrderDelete");
  });

  it("reports only a successful existing pending-order deletion and never performs a cancellation from its reporter", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain("if(trade.OrderDelete(t)) managed_order_deleted = true;");
    expect(source).toContain("telegram_pending_order_cancellation_observed = true;");
    expect(source).toContain('SendTelegramLifecycleUpdate("basket_cancelled", 6, observed_price, false, event_time)');
    const reporter = source.slice(source.indexOf("bool ReportTelegramBasketCancellation"), source.indexOf("void MonitorTelegramLifecycle"));
    expect(reporter).toContain("if(!telegram_pending_order_cancellation_observed || HasManagedPendingOrder()) return false;");
    expect(reporter).not.toContain("trade.PositionClose");
    expect(reporter).not.toContain("trade.PositionModify");
    expect(reporter).not.toContain("trade.OrderDelete");
  });
});
