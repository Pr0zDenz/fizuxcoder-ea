import { createHash } from "node:crypto";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import {
  telegramDailySummaryAudits,
  telegramDailySummaryRuns,
  telegramDailySummarySettings,
  telegramSignalEvents,
  telegramSignalLifecycleUpdates,
} from "../drizzle/schema";
import { getDb } from "./db";
import { brokerNeutralSymbol, getTelegramDailySummaryDestination, sendTelegramMessage } from "./telegramSignals";

export const DAILY_SUMMARY_KEY = "owner_daily_telegram_summary";
export const DAILY_SUMMARY_TIMEZONE = "Asia/Kuala_Lumpur";
/** 00:00 GMT+8, expressed as a six-field UTC cron. */
export const DAILY_SUMMARY_CRON = "0 0 16 * * *";

type SummarySettings = typeof telegramDailySummarySettings.$inferSelect;
type DeliveredSetup = Pick<typeof telegramSignalEvents.$inferSelect, "id" | "symbol" | "direction">;
type DeliveredLifecycle = Pick<typeof telegramSignalLifecycleUpdates.$inferSelect, "originalSignalEventId" | "stage">;

function malaysiaCalendarParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DAILY_SUMMARY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

function dayLabel(year: number, month: number, day: number) {
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? "Unknown";
  return `${String(day).padStart(2, "0")}-${monthName}-${year}`;
}

/** The daily cron runs at local midnight and summarizes the full preceding Malaysia calendar day. */
export function getDailySummaryWindow(now: Date = new Date()) {
  const currentMalaysiaDay = malaysiaCalendarParts(now);
  const previousLocalDate = new Date(Date.UTC(currentMalaysiaDay.year, currentMalaysiaDay.month - 1, currentMalaysiaDay.day - 1));
  const target = { year: previousLocalDate.getUTCFullYear(), month: previousLocalDate.getUTCMonth() + 1, day: previousLocalDate.getUTCDate() };
  // Malaysia is UTC+8 year-round: local 00:00 is previous UTC day at 16:00.
  const start = new Date(Date.UTC(target.year, target.month - 1, target.day - 1, 16, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { summaryDate: dayLabel(target.year, target.month, target.day), start, end };
}

export function formatTelegramDailySummary({ summaryDate, setups, lifecycleUpdates }: { summaryDate: string; setups: DeliveredSetup[]; lifecycleUpdates: DeliveredLifecycle[] }) {
  const outcomes = new Map<number, string[]>();
  for (const update of lifecycleUpdates) {
    const known = outcomes.get(update.originalSignalEventId) ?? [];
    known.push(update.stage);
    outcomes.set(update.originalSignalEventId, known);
  }
  const tpCount = lifecycleUpdates.filter(item => item.stage === "TP1" || item.stage === "TP2" || item.stage === "TP3").length;
  const slCount = lifecycleUpdates.filter(item => item.stage === "SL").length;
  const basketClosedCount = lifecycleUpdates.filter(item => item.stage === "BASKET_CLOSED").length;
  const basketCancelledCount = lifecycleUpdates.filter(item => item.stage === "BASKET_CANCELLED").length;
  const details = setups.slice(0, 8).map(setup => {
    const outcome = outcomes.get(setup.id)?.join(", ") ?? "no lifecycle update recorded";
    return `• ${brokerNeutralSymbol(setup.symbol)} ${setup.direction} — ${outcome}`;
  });
  const omitted = setups.length - details.length;
  return [
    "📡 Gemini Bot EA — Daily Signal Summary",
    `📅 Trading day: ${summaryDate} (GMT+8)`,
    "",
    `📊 Delivered setup signals: ${setups.length}`,
    `✅ TP lifecycle updates: ${tpCount}`,
    `🛑 SL lifecycle updates: ${slCount}`,
    `💼 Confirmed basket-closure updates: ${basketClosedCount}`,
    `⚠️ Pending-order cancellation updates: ${basketCancelledCount}`,
    "",
    ...(details.length ? ["Signal record:", ...details, ...(omitted > 0 ? [`• +${omitted} additional delivered setup signal(s) recorded`] : [])] : ["No delivered setup signals or TP/SL lifecycle updates were recorded for this Malaysia trading day."]),
    "",
    "⚠️ Summary of channel notifications only, not a performance statement or forecast. Trading involves risk; verify conditions, costs, and your own risk limits before acting.",
  ].join("\n");
}

async function readSettings(ownerUserId: number): Promise<SummarySettings | null> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [settings] = await db.select().from(telegramDailySummarySettings)
    .where(eq(telegramDailySummarySettings.settingKey, DAILY_SUMMARY_KEY)).limit(1);
  if (settings && settings.ownerUserId !== ownerUserId) throw new Error("The daily Telegram summary belongs to a different owner account");
  return settings ?? null;
}

async function ensureSettings(ownerUserId: number): Promise<SummarySettings> {
  const existing = await readSettings(ownerUserId);
  if (existing) return existing;
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(telegramDailySummarySettings).values({
    settingKey: DAILY_SUMMARY_KEY,
    ownerUserId,
    timezone: DAILY_SUMMARY_TIMEZONE,
    cronExpression: DAILY_SUMMARY_CRON,
    automaticDeliveryEnabled: "no",
    killSwitchEngaged: "yes",
    sendWhenNoSignals: "no",
  });
  await db.insert(telegramDailySummaryAudits).values({
    settingKey: DAILY_SUMMARY_KEY,
    actorUserId: ownerUserId,
    action: "settings_updated",
    note: "Daily Telegram summary initialized in default-paused state",
  });
  const created = await readSettings(ownerUserId);
  if (!created) throw new Error("Unable to create daily Telegram summary settings");
  return created;
}

function publicStatus(settings: SummarySettings | null) {
  return {
    configured: Boolean(settings),
    timezone: settings?.timezone ?? DAILY_SUMMARY_TIMEZONE,
    cronExpression: settings?.cronExpression ?? DAILY_SUMMARY_CRON,
    automaticDeliveryEnabled: settings?.automaticDeliveryEnabled ?? "no",
    killSwitchEngaged: settings?.killSwitchEngaged ?? "yes",
    sendWhenNoSignals: settings?.sendWhenNoSignals ?? "no",
    scheduleConfigured: Boolean(settings?.scheduleCronTaskUid),
    lastRunAt: settings?.lastRunAt ?? null,
  } as const;
}

export async function getTelegramDailySummaryStatus(ownerUserId: number) {
  return publicStatus(await readSettings(ownerUserId));
}

export async function setTelegramDailySummaryEmptyPolicy({ ownerUserId, sendWhenNoSignals }: { ownerUserId: number; sendWhenNoSignals: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await ensureSettings(ownerUserId);
  await db.update(telegramDailySummarySettings).set({ sendWhenNoSignals: sendWhenNoSignals ? "yes" : "no" })
    .where(eq(telegramDailySummarySettings.settingKey, DAILY_SUMMARY_KEY));
  await db.insert(telegramDailySummaryAudits).values({
    settingKey: DAILY_SUMMARY_KEY,
    actorUserId: ownerUserId,
    action: "settings_updated",
    note: sendWhenNoSignals ? "Owner enabled no-signal daily summary posts" : "Owner disabled no-signal daily summary posts",
  });
  return getTelegramDailySummaryStatus(ownerUserId);
}

export async function engageTelegramDailySummaryKillSwitch(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const settings = await ensureSettings(ownerUserId);
  await db.update(telegramDailySummarySettings).set({ automaticDeliveryEnabled: "no", killSwitchEngaged: "yes" })
    .where(eq(telegramDailySummarySettings.settingKey, DAILY_SUMMARY_KEY));
  await db.insert(telegramDailySummaryAudits).values({
    settingKey: DAILY_SUMMARY_KEY,
    actorUserId: ownerUserId,
    action: "schedule_paused",
    note: settings.scheduleCronTaskUid ? "Daily summary kill switch engaged" : "Daily summary kill switch engaged before schedule creation",
  });
  return getTelegramDailySummaryStatus(ownerUserId);
}

export async function getTelegramDailySummaryTaskUid(ownerUserId: number) {
  return (await readSettings(ownerUserId))?.scheduleCronTaskUid ?? null;
}

export async function activateTelegramDailySummary({ ownerUserId, taskUid }: { ownerUserId: number; taskUid: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const settings = await ensureSettings(ownerUserId);
  const action = settings.scheduleCronTaskUid ? "schedule_resumed" : "schedule_created" as const;
  await db.update(telegramDailySummarySettings).set({
    scheduleCronTaskUid: taskUid,
    automaticDeliveryEnabled: "yes",
    killSwitchEngaged: "no",
    cronExpression: DAILY_SUMMARY_CRON,
  }).where(eq(telegramDailySummarySettings.settingKey, DAILY_SUMMARY_KEY));
  await db.insert(telegramDailySummaryAudits).values({
    settingKey: DAILY_SUMMARY_KEY,
    actorUserId: ownerUserId,
    action,
    note: "Owner explicitly enabled the midnight GMT+8 daily Telegram summary",
  });
  return getTelegramDailySummaryStatus(ownerUserId);
}

/** Called only by the authenticated scheduled endpoint. It never changes EA settings, trades, or lifecycle delivery. */
export async function runTelegramDailySummary(taskUid: string, now: Date = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [settings] = await db.select().from(telegramDailySummarySettings).where(and(
    eq(telegramDailySummarySettings.settingKey, DAILY_SUMMARY_KEY),
    eq(telegramDailySummarySettings.scheduleCronTaskUid, taskUid),
  )).limit(1);
  if (!settings) return { ok: true, skipped: "unknown_task" as const };
  await db.update(telegramDailySummarySettings).set({ lastRunAt: now }).where(eq(telegramDailySummarySettings.settingKey, DAILY_SUMMARY_KEY));
  if (settings.automaticDeliveryEnabled !== "yes" || settings.killSwitchEngaged === "yes") {
    await db.insert(telegramDailySummaryAudits).values({ settingKey: DAILY_SUMMARY_KEY, actorUserId: null, action: "run_skipped", note: "Daily summary is paused or its kill switch is engaged" });
    return { ok: true, skipped: "paused" as const };
  }
  const window = getDailySummaryWindow(now);
  let runId: number;
  try {
    const result = await db.insert(telegramDailySummaryRuns).values({ settingKey: DAILY_SUMMARY_KEY, summaryDate: window.summaryDate, status: "running" });
    runId = Number(result[0].insertId);
  } catch (error) {
    const [existing] = await db.select({ id: telegramDailySummaryRuns.id, status: telegramDailySummaryRuns.status })
      .from(telegramDailySummaryRuns).where(eq(telegramDailySummaryRuns.summaryDate, window.summaryDate)).limit(1);
    if (existing) return { ok: true, skipped: "already_recorded" as const, status: existing.status };
    throw error;
  }
  const [events, lifecycleUpdates] = await Promise.all([
    db.select({ id: telegramSignalEvents.id, symbol: telegramSignalEvents.symbol, direction: telegramSignalEvents.direction, eventType: telegramSignalEvents.eventType })
      .from(telegramSignalEvents).where(and(eq(telegramSignalEvents.status, "delivered"), gte(telegramSignalEvents.deliveredAt, window.start), lt(telegramSignalEvents.deliveredAt, window.end))).orderBy(asc(telegramSignalEvents.deliveredAt)),
    db.select({ originalSignalEventId: telegramSignalLifecycleUpdates.originalSignalEventId, stage: telegramSignalLifecycleUpdates.stage })
      .from(telegramSignalLifecycleUpdates).where(and(eq(telegramSignalLifecycleUpdates.status, "delivered"), gte(telegramSignalLifecycleUpdates.updatedAt, window.start), lt(telegramSignalLifecycleUpdates.updatedAt, window.end))).orderBy(asc(telegramSignalLifecycleUpdates.updatedAt)),
  ]);
  const setups = events.filter(event => event.eventType === "setup");
  const hasRecordedChannelActivity = setups.length > 0 || lifecycleUpdates.length > 0;
  const tpCount = lifecycleUpdates.filter(item => item.stage === "TP1" || item.stage === "TP2" || item.stage === "TP3").length;
  const slCount = lifecycleUpdates.filter(item => item.stage === "SL").length;
  if (!hasRecordedChannelActivity && settings.sendWhenNoSignals !== "yes") {
    await db.update(telegramDailySummaryRuns).set({ status: "skipped", setupCount: 0, takeProfitCount: 0, stopLossCount: 0, completedAt: new Date() }).where(eq(telegramDailySummaryRuns.id, runId));
    await db.insert(telegramDailySummaryAudits).values({ settingKey: DAILY_SUMMARY_KEY, runId, actorUserId: null, action: "run_skipped", note: `No delivered channel events for ${window.summaryDate}; no-message policy selected` });
    return { ok: true, skipped: "no_signals" as const, summaryDate: window.summaryDate };
  }
  const messageText = formatTelegramDailySummary({ summaryDate: window.summaryDate, setups, lifecycleUpdates });
  const messageHash = createHash("sha256").update(messageText).digest("hex");
  await db.update(telegramDailySummaryRuns).set({ setupCount: setups.length, takeProfitCount: tpCount, stopLossCount: slCount, messageHash }).where(eq(telegramDailySummaryRuns.id, runId));
  await db.insert(telegramDailySummaryAudits).values({ settingKey: DAILY_SUMMARY_KEY, runId, actorUserId: null, action: "run_started", note: `Daily summary assembled for ${window.summaryDate}` });
  try {
    const destination = await getTelegramDailySummaryDestination();
    const telegramMessageId = await sendTelegramMessage(destination.channelId, messageText);
    await db.update(telegramDailySummaryRuns).set({ status: "delivered", telegramMessageId, completedAt: new Date(), failureReason: null }).where(eq(telegramDailySummaryRuns.id, runId));
    await db.insert(telegramDailySummaryAudits).values({ settingKey: DAILY_SUMMARY_KEY, runId, actorUserId: null, action: "run_delivered", note: `Daily summary Telegram message ${telegramMessageId} confirmed` });
    return { ok: true, delivered: true, summaryDate: window.summaryDate, telegramMessageId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Daily Telegram summary delivery failed";
    await db.update(telegramDailySummaryRuns).set({ status: "failed", failureReason: reason.slice(0, 255), completedAt: new Date() }).where(eq(telegramDailySummaryRuns.id, runId));
    await db.insert(telegramDailySummaryAudits).values({ settingKey: DAILY_SUMMARY_KEY, runId, actorUserId: null, action: "run_failed", note: reason.slice(0, 255) });
    // Return 2xx to avoid a platform retry that could duplicate a post when a provider timeout is ambiguous.
    return { ok: false, failed: true, summaryDate: window.summaryDate };
  }
}
