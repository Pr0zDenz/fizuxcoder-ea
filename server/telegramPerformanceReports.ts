import { createHash } from "node:crypto";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { telegramDailySummarySettings, telegramPerformanceReportRuns, telegramSignalEvents, telegramSignalLifecycleUpdates } from "../drizzle/schema";
import { getDb } from "./db";
import { getTelegramDailySummaryDestination, sendTelegramMessage } from "./telegramSignals";

export const PERFORMANCE_SETTING_KEY = "owner_daily_telegram_summary";
export const PERFORMANCE_TIMEZONE = "Asia/Kuala_Lumpur";
export const DAILY_PERFORMANCE_CRON = "0 59 15 * * *"; // 23:59 Malaysia time
export const WEEKLY_PERFORMANCE_CRON = "0 0 1 * * 1"; // Monday 09:00 Malaysia time, previous Monday-Sunday
export const GOLD_POINTS_PER_PIP = 10;
export const GOLD_POINT_PRICE = 0.01;

export type PerformanceOutcome = {
  id: number;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  result: "WIN" | "LOSS";
  pips: number;
  occurredDate: string;
};

type DeliveredSetup = Pick<typeof telegramSignalEvents.$inferSelect, "id" | "symbol" | "direction" | "entryPrice" | "eaDate" | "deliveredAt">;
type DeliveredLifecycle = Pick<typeof telegramSignalLifecycleUpdates.$inferSelect, "originalSignalEventId" | "stage" | "hitPrice" | "updatedAt">;

function malaysiaParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: PERFORMANCE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

function isoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function labelFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"][month - 1] ?? "UNKNOWN"}`;
}

export function getPerformanceWindow(reportType: "daily" | "weekly", now: Date = new Date()) {
  const current = malaysiaParts(now);
  const currentLocalDay = new Date(Date.UTC(current.year, current.month - 1, current.day));
  const localMidnightUtc = new Date(currentLocalDay.getTime() - 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000);
  const end = reportType === "daily" ? new Date(localMidnightUtc.getTime() + 24 * 60 * 60 * 1000) : new Date(localMidnightUtc.getTime() - 2 * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - (reportType === "daily" ? 24 : 24 * 5) * 60 * 60 * 1000);
  const periodStartLocal = reportType === "daily" ? currentLocalDay : new Date(currentLocalDay.getTime() - ((currentLocalDay.getUTCDay() || 7) - 1 + 7) * 24 * 60 * 60 * 1000);
  const periodEndLocal = reportType === "daily" ? currentLocalDay : new Date(periodStartLocal.getTime() + 4 * 24 * 60 * 60 * 1000);
  const periodStartDate = isoDate(periodStartLocal.getUTCFullYear(), periodStartLocal.getUTCMonth() + 1, periodStartLocal.getUTCDate());
  const periodEndDate = isoDate(periodEndLocal.getUTCFullYear(), periodEndLocal.getUTCMonth() + 1, periodEndLocal.getUTCDate());
  return { start, end, periodStartDate, periodEndDate, label: reportType === "daily" ? labelFromIso(periodStartDate) : `${labelFromIso(periodStartDate)} – ${labelFromIso(periodEndDate)}` };
}

function roundPips(value: number) {
  return Math.round(value * 10) / 10;
}

export function derivePerformanceOutcomes(setups: DeliveredSetup[], lifecycleUpdates: DeliveredLifecycle[]): PerformanceOutcome[] {
  const bySetup = new Map<number, DeliveredLifecycle[]>();
  for (const update of lifecycleUpdates) {
    const list = bySetup.get(update.originalSignalEventId) ?? [];
    list.push(update);
    bySetup.set(update.originalSignalEventId, list);
  }
  return setups.flatMap(setup => {
    const entry = Number(setup.entryPrice);
    if (!Number.isFinite(entry)) return [];
    const updates = bySetup.get(setup.id) ?? [];
    const terminal = updates.find(update => update.stage === "SL") ?? ["TP3", "TP2", "TP1", "BASKET_CLOSED"].map(stage => updates.find(update => update.stage === stage)).find(Boolean);
    if (!terminal) return [];
    const hit = Number(terminal.hitPrice);
    if (!Number.isFinite(hit)) return [];
    const result = terminal.stage === "SL" ? "LOSS" : "WIN";
    return [{ id: setup.id, symbol: setup.symbol, direction: setup.direction, entryPrice: entry, result, pips: roundPips(Math.abs(hit - entry) / (GOLD_POINT_PRICE * GOLD_POINTS_PER_PIP)), occurredDate: setup.eaDate }];
  });
}

export function formatPerformanceReport(reportType: "daily" | "weekly", outcomes: PerformanceOutcome[], periodLabel: string) {
  const wins = outcomes.filter(item => item.result === "WIN");
  const losses = outcomes.filter(item => item.result === "LOSS");
  const totalPips = roundPips(outcomes.reduce((sum, item) => sum + (item.result === "WIN" ? item.pips : -item.pips), 0));
  let streak = 0;
  for (const item of [...outcomes].reverse()) {
    if (item.result !== "WIN") break;
    streak += 1;
  }
  const header = reportType === "daily" ? `GEMINI QUANT BOT DAILY PERFORMANCE | ${periodLabel}` : `GEMINI QUANT BOT WEEKLY PERFORMANCE | ${periodLabel}`;
  const sections = reportType === "weekly" ? Array.from(new Set(outcomes.map(item => item.occurredDate))).map(date => {
    const dayOutcomes = outcomes.filter(item => item.occurredDate === date);
    return [`\n${date.toUpperCase()}`, ...dayOutcomes.map(item => `${item.result === "WIN" ? "🟢" : "🔴"}GOLD ${item.direction} : ${item.result === "WIN" ? `+${item.pips}pips` : `SL -${item.pips}pips`}`)].join("\n");
  }) : outcomes.map(item => `${item.result === "WIN" ? "🟢" : "🔴"}GOLD ${item.direction} : ${item.result === "WIN" ? `+${item.pips}pips` : `SL -${item.pips}pips`}`);
  return [header, ...sections, "", `Total : ${wins.length} Win, ${losses.length} Loss`, `Net Pips : ${totalPips} Pips⚜️`, "", "➖➖➖➖➖➖➖➖➖➖➖", "", `${streak} WINSTREAKS ONGOING ✅`, "", "➖➖➖➖➖➖➖➖➖➖➖", "", "⚠️ Reported outcomes are based only on authenticated EA lifecycle records. Past results are not a guarantee of future performance. Trading involves risk."].join("\n");
}

export async function runTelegramPerformanceReportByTask(taskUid: string, now: Date = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [settings] = await db.select({ dailyTaskUid: telegramDailySummarySettings.dailyPerformanceScheduleCronTaskUid, weeklyTaskUid: telegramDailySummarySettings.weeklyPerformanceScheduleCronTaskUid }).from(telegramDailySummarySettings).where(eq(telegramDailySummarySettings.settingKey, PERFORMANCE_SETTING_KEY)).limit(1);
  if (!settings) return { ok: true, skipped: "unknown_task" as const };
  const reportType = settings.dailyTaskUid === taskUid ? "daily" : settings.weeklyTaskUid === taskUid ? "weekly" : null;
  if (!reportType) return { ok: true, skipped: "unknown_task" as const };
  return runTelegramPerformanceReport(reportType, now);
}

export async function runTelegramPerformanceReport(reportType: "daily" | "weekly", now: Date = new Date(), revision = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [settings] = await db.select().from(telegramDailySummarySettings).where(eq(telegramDailySummarySettings.settingKey, PERFORMANCE_SETTING_KEY)).limit(1);
  if (!settings || settings.automaticDeliveryEnabled !== "yes" || settings.killSwitchEngaged === "yes") return { ok: true, skipped: "paused" as const };
  const window = getPerformanceWindow(reportType, now);
  const [events, lifecycle] = await Promise.all([
    db.select({ id: telegramSignalEvents.id, symbol: telegramSignalEvents.symbol, direction: telegramSignalEvents.direction, entryPrice: telegramSignalEvents.entryPrice, eaDate: telegramSignalEvents.eaDate, deliveredAt: telegramSignalEvents.deliveredAt }).from(telegramSignalEvents).where(and(eq(telegramSignalEvents.status, "delivered"), eq(telegramSignalEvents.eventType, "setup"), gte(telegramSignalEvents.deliveredAt, window.start), lt(telegramSignalEvents.deliveredAt, window.end))).orderBy(asc(telegramSignalEvents.deliveredAt)),
    db.select({ originalSignalEventId: telegramSignalLifecycleUpdates.originalSignalEventId, stage: telegramSignalLifecycleUpdates.stage, hitPrice: telegramSignalLifecycleUpdates.hitPrice, updatedAt: telegramSignalLifecycleUpdates.updatedAt }).from(telegramSignalLifecycleUpdates).where(and(eq(telegramSignalLifecycleUpdates.status, "delivered"), gte(telegramSignalLifecycleUpdates.updatedAt, window.start), lt(telegramSignalLifecycleUpdates.updatedAt, window.end))).orderBy(asc(telegramSignalLifecycleUpdates.updatedAt)),
  ]);
  const outcomes = derivePerformanceOutcomes(events, lifecycle);
  const message = formatPerformanceReport(reportType, outcomes, window.label);
  const hash = createHash("sha256").update(message).digest("hex");
  let runId: number;
  try {
    const result = await db.insert(telegramPerformanceReportRuns).values({ settingKey: PERFORMANCE_SETTING_KEY, reportType, periodStart: window.start, periodEnd: window.end, revision, status: "running", winCount: outcomes.filter(item => item.result === "WIN").length, lossCount: outcomes.filter(item => item.result === "LOSS").length, totalPips: String(roundPips(outcomes.reduce((sum, item) => sum + (item.result === "WIN" ? item.pips : -item.pips), 0))), currentWinStreak: (() => { let value = 0; for (const item of outcomes.slice().reverse()) { if (item.result !== "WIN") break; value += 1; } return value; })(), messageHash: hash });
    runId = Number(result[0].insertId);
  } catch {
    return { ok: true, skipped: "already_recorded" as const, reportType, periodStart: window.start.toISOString() };
  }
  try {
    const destination = await getTelegramDailySummaryDestination();
    const telegramMessageId = await sendTelegramMessage(destination.channelId, message);
    await db.update(telegramPerformanceReportRuns).set({ status: "delivered", telegramMessageId, completedAt: new Date(), failureReason: null }).where(eq(telegramPerformanceReportRuns.id, runId));
    return { ok: true, delivered: true, reportType, telegramMessageId, runId, outcomeCount: outcomes.length };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Telegram performance report delivery failed";
    await db.update(telegramPerformanceReportRuns).set({ status: "failed", failureReason: reason.slice(0, 255), completedAt: new Date() }).where(eq(telegramPerformanceReportRuns.id, runId));
    return { ok: false, failed: true, reportType, runId };
  }
}
