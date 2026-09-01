import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { telegramSignalEvents, telegramSignalLifecycleUpdates } from "../drizzle/schema.ts";
import { derivePerformanceOutcomes, formatPerformanceReport, getPerformanceWindow } from "../server/telegramPerformanceReports.ts";

const now = new Date("2026-09-01T16:01:00.000Z");
const window = getPerformanceWindow("daily", now);
const db = await getDb();
if (!db) throw new Error("Database unavailable");
const [events, lifecycle] = await Promise.all([
  db.select({ id: telegramSignalEvents.id, symbol: telegramSignalEvents.symbol, direction: telegramSignalEvents.direction, entryPrice: telegramSignalEvents.entryPrice, eaDate: telegramSignalEvents.eaDate, deliveredAt: telegramSignalEvents.deliveredAt }).from(telegramSignalEvents).where(and(eq(telegramSignalEvents.status, "delivered"), eq(telegramSignalEvents.eventType, "setup"), gte(telegramSignalEvents.deliveredAt, window.start), lt(telegramSignalEvents.deliveredAt, window.end))).orderBy(asc(telegramSignalEvents.deliveredAt)),
  db.select({ originalSignalEventId: telegramSignalLifecycleUpdates.originalSignalEventId, stage: telegramSignalLifecycleUpdates.stage, hitPrice: telegramSignalLifecycleUpdates.hitPrice, updatedAt: telegramSignalLifecycleUpdates.updatedAt }).from(telegramSignalLifecycleUpdates).where(and(eq(telegramSignalLifecycleUpdates.status, "delivered"), gte(telegramSignalLifecycleUpdates.updatedAt, window.start), lt(telegramSignalLifecycleUpdates.updatedAt, window.end))).orderBy(asc(telegramSignalLifecycleUpdates.updatedAt)),
]);
const outcomes = derivePerformanceOutcomes(events, lifecycle);
console.log(JSON.stringify({ window: { start: window.start.toISOString(), end: window.end.toISOString(), label: window.label }, setupCount: events.length, lifecycleCount: lifecycle.length, outcomeCount: outcomes.length, message: formatPerformanceReport("daily", outcomes, window.label) }, null, 2));
