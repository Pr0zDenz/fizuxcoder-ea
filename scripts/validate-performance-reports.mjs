import { and, asc, eq, gte, lt } from "drizzle-orm";
import { telegramDailySummarySettings, telegramSignalEvents, telegramSignalLifecycleUpdates } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { derivePerformanceOutcomes, formatPerformanceReport, getPerformanceWindow, PERFORMANCE_SETTING_KEY } from "../server/telegramPerformanceReports.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const [settings] = await db.select().from(telegramDailySummarySettings).where(eq(telegramDailySummarySettings.settingKey, PERFORMANCE_SETTING_KEY)).limit(1);
if (!settings) throw new Error("Performance settings row is missing");
console.log(JSON.stringify({
  automaticDeliveryEnabled: settings.automaticDeliveryEnabled,
  killSwitchEngaged: settings.killSwitchEngaged,
  dailyTaskUid: settings.dailyPerformanceScheduleCronTaskUid,
  dailyCron: settings.dailyPerformanceCronExpression,
  weeklyTaskUid: settings.weeklyPerformanceScheduleCronTaskUid,
  weeklyCron: settings.weeklyPerformanceCronExpression,
}, null, 2));

for (const reportType of ["daily", "weekly"]) {
  const window = getPerformanceWindow(reportType, new Date("2026-08-31T01:00:00.000Z"));
  const events = await db.select({ id: telegramSignalEvents.id, symbol: telegramSignalEvents.symbol, direction: telegramSignalEvents.direction, entryPrice: telegramSignalEvents.entryPrice, eaDate: telegramSignalEvents.eaDate, deliveredAt: telegramSignalEvents.deliveredAt }).from(telegramSignalEvents).where(and(eq(telegramSignalEvents.status, "delivered"), eq(telegramSignalEvents.eventType, "setup"), gte(telegramSignalEvents.deliveredAt, window.start), lt(telegramSignalEvents.deliveredAt, window.end))).orderBy(asc(telegramSignalEvents.deliveredAt));
  const lifecycle = await db.select({ originalSignalEventId: telegramSignalLifecycleUpdates.originalSignalEventId, stage: telegramSignalLifecycleUpdates.stage, hitPrice: telegramSignalLifecycleUpdates.hitPrice, updatedAt: telegramSignalLifecycleUpdates.updatedAt }).from(telegramSignalLifecycleUpdates).where(and(eq(telegramSignalLifecycleUpdates.status, "delivered"), gte(telegramSignalLifecycleUpdates.updatedAt, window.start), lt(telegramSignalLifecycleUpdates.updatedAt, window.end))).orderBy(asc(telegramSignalLifecycleUpdates.updatedAt));
  const outcomes = derivePerformanceOutcomes(events, lifecycle);
  const preview = formatPerformanceReport(reportType, outcomes, window.label).split("\n").slice(0, 8).join("\n");
  console.log(JSON.stringify({ reportType, periodStart: window.start.toISOString(), periodEnd: window.end.toISOString(), setupCount: events.length, lifecycleCount: lifecycle.length, outcomeCount: outcomes.length, preview }, null, 2));
}
