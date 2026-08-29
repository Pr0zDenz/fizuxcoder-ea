import { and, asc, eq, gte, lt } from "drizzle-orm";
import { telegramSignalEvents, telegramSignalLifecycleUpdates } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { derivePerformanceOutcomes, formatPerformanceReport, getPerformanceWindow } from "../server/telegramPerformanceReports.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");

async function preview(reportType, referenceNow) {
  const window = getPerformanceWindow(reportType, referenceNow);
  const events = await db.select({ id: telegramSignalEvents.id, symbol: telegramSignalEvents.symbol, direction: telegramSignalEvents.direction, entryPrice: telegramSignalEvents.entryPrice, eaDate: telegramSignalEvents.eaDate, deliveredAt: telegramSignalEvents.deliveredAt }).from(telegramSignalEvents).where(and(eq(telegramSignalEvents.status, "delivered"), eq(telegramSignalEvents.eventType, "setup"), gte(telegramSignalEvents.deliveredAt, window.start), lt(telegramSignalEvents.deliveredAt, window.end))).orderBy(asc(telegramSignalEvents.deliveredAt));
  const lifecycle = await db.select({ originalSignalEventId: telegramSignalLifecycleUpdates.originalSignalEventId, stage: telegramSignalLifecycleUpdates.stage, hitPrice: telegramSignalLifecycleUpdates.hitPrice, updatedAt: telegramSignalLifecycleUpdates.updatedAt }).from(telegramSignalLifecycleUpdates).where(and(eq(telegramSignalLifecycleUpdates.status, "delivered"), gte(telegramSignalLifecycleUpdates.updatedAt, window.start), lt(telegramSignalLifecycleUpdates.updatedAt, window.end))).orderBy(asc(telegramSignalLifecycleUpdates.updatedAt));
  const outcomes = derivePerformanceOutcomes(events, lifecycle);
  return { reportType, window: { start: window.start.toISOString(), end: window.end.toISOString(), label: window.label }, setupCount: events.length, lifecycleCount: lifecycle.length, outcomeCount: outcomes.length, outcomes, message: formatPerformanceReport(reportType, outcomes, window.label) };
}

console.log(JSON.stringify({
  daily: await preview("daily", new Date("2026-08-30T15:59:00.000Z")),
  weekly: await preview("weekly", new Date("2026-08-31T01:00:00.000Z")),
}, null, 2));
