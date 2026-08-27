import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { entitlements, telegramSignalAudits, telegramSignalEvents, telegramSignalSettings, telegramSignalSettingsAudits } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";

const SETTINGS_KEY = "primary";
const DEFAULT_RISK_NOTE = "Automated EA signal for market observation only. Trading involves risk; verify conditions, costs, and your own risk limits before acting.";

type SignalInput = {
  eventId: string;
  eventType: "setup" | "take_profit";
  accountNumber: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: string;
  takeProfit?: string;
  stopLoss?: string;
  occurredAt: string;
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeNumericText(value: unknown, label: string, required = false) {
  const text = cleanText(value, 32);
  if (!text && !required) return undefined;
  if (!text || !/^-?\d+(?:\.\d+)?$/.test(text)) throw new Error(`${label} must be a numeric value`);
  return text;
}

export function parseTelegramSignalInput(body: Record<string, unknown>): SignalInput {
  const eventId = cleanText(body.eventId, 96);
  const eventType = body.eventType === "setup" || body.eventType === "take_profit" ? body.eventType : null;
  const accountNumber = cleanText(body.accountNumber, 20);
  const symbol = cleanText(body.symbol, 64);
  const direction = body.direction === "BUY" || body.direction === "SELL" ? body.direction : null;
  const entryPrice = safeNumericText(body.entryPrice, "entryPrice", true);
  const takeProfit = safeNumericText(body.takeProfit, "takeProfit");
  const stopLoss = safeNumericText(body.stopLoss, "stopLoss");
  const occurredAt = cleanText(body.occurredAt, 8);

  if (!/^[A-Za-z0-9_-]{6,96}$/.test(eventId)) throw new Error("eventId is invalid");
  if (!eventType) throw new Error("eventType must be setup or take_profit");
  if (!/^\d{4,20}$/.test(accountNumber)) throw new Error("accountNumber is invalid");
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(symbol)) throw new Error("symbol is invalid");
  if (!direction) throw new Error("direction must be BUY or SELL");
  if (!entryPrice) throw new Error("entryPrice must be a numeric value");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(occurredAt)) throw new Error("occurredAt must use 24-hour HH:mm:ss format");

  return { eventId, eventType, accountNumber, symbol, direction, entryPrice, takeProfit, stopLoss, occurredAt };
}

export function formatTelegramSignal(signal: SignalInput) {
  const levels = [
    `Reference entry: ${signal.entryPrice}`,
    signal.takeProfit ? `Safe TP: ${signal.takeProfit}` : null,
    signal.stopLoss ? `SL: ${signal.stopLoss}` : null,
  ].filter(Boolean);
  return [
    "FizuxCoder EA Signal",
    `Symbol: ${signal.symbol}`,
    `Direction: ${signal.direction}`,
    ...levels,
    `Event time (EA clock): ${signal.occurredAt}`,
    "",
    DEFAULT_RISK_NOTE,
  ].join("\n");
}

function isTelegramChannelId(value: string) {
  return /^@[A-Za-z0-9_]{5,}$/.test(value) || /^-100\d{5,20}$/.test(value);
}

export function deliveryState(settings: { channelId: string | null; automaticDeliveryEnabled: "yes" | "no"; killSwitchEngaged: "yes" | "no" } | undefined) {
  if (!settings?.channelId) return { state: "not_configured" as const, armed: false, message: "Telegram bot credentials or a channel identity have not been configured." };
  if (settings.killSwitchEngaged === "yes") return { state: "kill_switch" as const, armed: false, message: "The Telegram kill switch is engaged. Signals will be recorded but not posted." };
  if (settings.automaticDeliveryEnabled !== "yes") return { state: "paused" as const, armed: false, message: "Automatic Telegram delivery is paused. Signals will be recorded but not posted." };
  if (!ENV.telegramBotToken) return { state: "not_configured" as const, armed: false, message: "Telegram bot credentials have not been configured." };
  return { state: "armed" as const, armed: true, message: "Validated setup signals can be delivered automatically. Duplicate event IDs are blocked." };
}

async function getSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select().from(telegramSignalSettings).where(eq(telegramSignalSettings.settingKey, SETTINGS_KEY)).limit(1);
  return { db, settings: rows[0] };
}

export async function getTelegramSignalDashboard() {
  const { db, settings } = await getSettings();
  const recent = await db.select().from(telegramSignalEvents).orderBy(desc(telegramSignalEvents.createdAt)).limit(8);
  const state = deliveryState(settings);
  return {
    state: state.state,
    automaticDeliveryEnabled: settings?.automaticDeliveryEnabled === "yes",
    killSwitchEngaged: settings?.killSwitchEngaged !== "no",
    configured: Boolean(settings?.channelId && ENV.telegramBotToken),
    channelId: settings?.channelId ?? null,
    channelLabel: settings?.channelLabel ?? null,
    message: state.message,
    counts: {
      delivered: recent.filter(item => item.status === "delivered").length,
      suppressed: recent.filter(item => item.status === "suppressed").length,
      failed: recent.filter(item => item.status === "failed").length,
    },
    recent: recent.map(item => ({ id: item.id, eventId: item.eventId, eventType: item.eventType, symbol: item.symbol, direction: item.direction, eaTime: item.eaTime, status: item.status, createdAt: item.createdAt.toISOString(), deliveredAt: item.deliveredAt?.toISOString() ?? null, failureReason: item.failureReason })),
  };
}

export async function updateTelegramSignalSettings(input: { actorUserId: number; channelId: string; channelLabel?: string; automaticDeliveryEnabled: boolean; killSwitchEngaged: boolean }) {
  const channelId = input.channelId.trim();
  const channelLabel = (input.channelLabel ?? "").trim().slice(0, 160) || null;
  if (!isTelegramChannelId(channelId)) throw new Error("Use a public @channel_username or private -100... channel ID");
  if (input.automaticDeliveryEnabled && !ENV.telegramBotToken) throw new Error("Add TELEGRAM_BOT_TOKEN before automatic delivery can be armed");
  if (!input.killSwitchEngaged && !ENV.telegramBotToken) throw new Error("Add TELEGRAM_BOT_TOKEN before releasing the kill switch");

  const { db } = await getSettings();
  await db.insert(telegramSignalSettings).values({ settingKey: SETTINGS_KEY, ownerUserId: input.actorUserId, channelId, channelLabel, automaticDeliveryEnabled: input.automaticDeliveryEnabled ? "yes" : "no", killSwitchEngaged: input.killSwitchEngaged ? "yes" : "no", updatedByUserId: input.actorUserId }).onDuplicateKeyUpdate({
    set: { ownerUserId: input.actorUserId, channelId, channelLabel, automaticDeliveryEnabled: input.automaticDeliveryEnabled ? "yes" : "no", killSwitchEngaged: input.killSwitchEngaged ? "yes" : "no", updatedByUserId: input.actorUserId, updatedAt: new Date() },
  });
  await db.insert(telegramSignalSettingsAudits).values({
    settingKey: SETTINGS_KEY,
    actorUserId: input.actorUserId,
    automaticDeliveryEnabled: input.automaticDeliveryEnabled ? "yes" : "no",
    killSwitchEngaged: input.killSwitchEngaged ? "yes" : "no",
    note: input.automaticDeliveryEnabled && !input.killSwitchEngaged ? "Automatic Telegram delivery armed by administrator." : "Telegram delivery settings updated by administrator.",
  });
  return getTelegramSignalDashboard();
}

async function sendTelegramMessage(channelId: string, text: string) {
  if (!ENV.telegramBotToken) throw new Error("Telegram bot token is not configured");
  const response = await fetch(`https://api.telegram.org/bot${ENV.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channelId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null) as { ok?: boolean; description?: string; result?: { message_id?: number } } | null;
  if (!response.ok || !payload?.ok || !payload.result?.message_id) throw new Error(payload?.description?.slice(0, 220) || `Telegram returned HTTP ${response.status}`);
  return String(payload.result.message_id);
}

export async function validateTelegramBotCredential() {
  if (!ENV.telegramBotToken) throw new Error("Telegram bot token is not configured");
  const response = await fetch(`https://api.telegram.org/bot${ENV.telegramBotToken}/getMe`, {
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as { ok?: boolean; description?: string; result?: { id?: number; username?: string; is_bot?: boolean } } | null;
  if (!response.ok || !payload?.ok || !payload.result?.is_bot || !payload.result.username) {
    throw new Error(payload?.description?.slice(0, 220) || `Telegram returned HTTP ${response.status}`);
  }
  return { id: payload.result.id ?? 0, username: payload.result.username };
}

async function recordAudit(signalEventId: number, action: "received" | "validated" | "suppressed" | "delivery_started" | "delivered" | "failed" | "rejected" | "test_requested", note: string, actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(telegramSignalAudits).values({ signalEventId, action, actorUserId, note: note.slice(0, 255) });
}

export async function receiveTelegramSignal(signal: SignalInput) {
  const { db, settings } = await getSettings();
  const existing = await db.select().from(telegramSignalEvents).where(eq(telegramSignalEvents.eventId, signal.eventId)).limit(1);
  if (existing[0]) return { created: false, id: existing[0].id, status: existing[0].status, delivered: existing[0].status === "delivered" };

  const messageText = formatTelegramSignal(signal);
  const activeEntitlement = await db.select({ id: entitlements.id }).from(entitlements).where(and(eq(entitlements.mt5AccountNumber, signal.accountNumber), eq(entitlements.status, "active"))).limit(1);
  if (!activeEntitlement[0]) {
    const result = await db.insert(telegramSignalEvents).values({ eventId: signal.eventId, eventType: signal.eventType, accountNumber: signal.accountNumber, symbol: signal.symbol, direction: signal.direction, entryPrice: signal.entryPrice, takeProfit: signal.takeProfit ?? null, stopLoss: signal.stopLoss ?? null, riskNote: DEFAULT_RISK_NOTE, messageText, status: "rejected", failureCode: "account_not_authorized", failureReason: "No active portal entitlement exists for this MT5 account.", eaTime: signal.occurredAt });
    const insertedId = Number(result[0].insertId);
    await recordAudit(insertedId, "received", `EA event received: ${signal.eventType}`);
    await recordAudit(insertedId, "rejected", "The originating MT5 account has no active portal entitlement.");
    return { created: true, id: insertedId, status: "rejected" as const, delivered: false };
  }
  const state = deliveryState(settings);
  const shouldSuppress = signal.eventType !== "setup" || !state.armed;
  const status = shouldSuppress ? "suppressed" as const : "received" as const;
  let insertedId: number;
  try {
    const result = await db.insert(telegramSignalEvents).values({ eventId: signal.eventId, eventType: signal.eventType, accountNumber: signal.accountNumber, symbol: signal.symbol, direction: signal.direction, entryPrice: signal.entryPrice, takeProfit: signal.takeProfit ?? null, stopLoss: signal.stopLoss ?? null, riskNote: DEFAULT_RISK_NOTE, messageText, status, eaTime: signal.occurredAt });
    insertedId = Number(result[0].insertId);
  } catch (error) {
    const duplicate = await db.select().from(telegramSignalEvents).where(eq(telegramSignalEvents.eventId, signal.eventId)).limit(1);
    if (duplicate[0]) return { created: false, id: duplicate[0].id, status: duplicate[0].status, delivered: duplicate[0].status === "delivered" };
    throw error;
  }
  await recordAudit(insertedId, "received", `EA event received: ${signal.eventType}`);
  if (shouldSuppress) {
    await recordAudit(insertedId, "suppressed", signal.eventType !== "setup" ? "Only setup events are eligible for automatic Telegram delivery." : state.message);
    return { created: true, id: insertedId, status, delivered: false };
  }

  const attemptKey = createHash("sha256").update(`${signal.eventId}:${randomUUID()}`).digest("hex");
  await db.update(telegramSignalEvents).set({ status: "delivering", deliveryAttemptKey: attemptKey }).where(eq(telegramSignalEvents.id, insertedId));
  await recordAudit(insertedId, "validated", "Setup signal validated for automatic delivery.");
  await recordAudit(insertedId, "delivery_started", "Telegram delivery started.");
  try {
    const telegramMessageId = await sendTelegramMessage(settings!.channelId!, messageText);
    await db.update(telegramSignalEvents).set({ status: "delivered", telegramMessageId, deliveredAt: new Date() }).where(eq(telegramSignalEvents.id, insertedId));
    await recordAudit(insertedId, "delivered", `Telegram message ${telegramMessageId} confirmed.`);
    return { created: true, id: insertedId, status: "delivered" as const, delivered: true, telegramMessageId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Telegram delivery failed";
    await db.update(telegramSignalEvents).set({ status: "failed", failureCode: "telegram_delivery_failed", failureReason: reason.slice(0, 255) }).where(eq(telegramSignalEvents.id, insertedId));
    await recordAudit(insertedId, "failed", reason);
    return { created: true, id: insertedId, status: "failed" as const, delivered: false };
  }
}

export async function sendTelegramConnectionTest(input: { actorUserId: number; confirmation: string }) {
  if (input.confirmation !== "SEND TELEGRAM TEST") throw new Error("Type SEND TELEGRAM TEST to confirm a visible channel post");
  const { db, settings } = await getSettings();
  if (!settings?.channelId || !ENV.telegramBotToken) throw new Error("Configure the Telegram bot token and channel identity first");
  const eventId = `test-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const result = await db.insert(telegramSignalEvents).values({ eventId, eventType: "setup", accountNumber: "0000", symbol: "TEST", direction: "BUY", entryPrice: "0", riskNote: DEFAULT_RISK_NOTE, messageText: "FizuxCoder Telegram connection test\n\nThis owner-authorized test confirms that the Admin Command Center can reach the configured channel. It is not a trading signal.", status: "delivering", eaTime: "00:00:00" });
  const eventIdDb = Number(result[0].insertId);
  await recordAudit(eventIdDb, "test_requested", "Owner confirmed a visible Telegram connection test.", input.actorUserId);
  await recordAudit(eventIdDb, "delivery_started", "Telegram connection test started.", input.actorUserId);
  try {
    const telegramMessageId = await sendTelegramMessage(settings.channelId, "FizuxCoder Telegram connection test\n\nThis owner-authorized test confirms that the Admin Command Center can reach the configured channel. It is not a trading signal.");
    await db.update(telegramSignalEvents).set({ status: "delivered", telegramMessageId, deliveredAt: new Date() }).where(eq(telegramSignalEvents.id, eventIdDb));
    await recordAudit(eventIdDb, "delivered", `Test message ${telegramMessageId} confirmed.`, input.actorUserId);
    return { status: "delivered" as const, telegramMessageId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Telegram test delivery failed";
    await db.update(telegramSignalEvents).set({ status: "failed", failureCode: "telegram_test_failed", failureReason: reason.slice(0, 255) }).where(eq(telegramSignalEvents.id, eventIdDb));
    await recordAudit(eventIdDb, "failed", reason, input.actorUserId);
    throw new Error(reason);
  }
}
