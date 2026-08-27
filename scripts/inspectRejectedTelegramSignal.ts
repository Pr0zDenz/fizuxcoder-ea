import { desc, eq } from "drizzle-orm";
import { entitlements, telegramSignalEvents } from "../drizzle/schema";
import { getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("Database is unavailable");

const [signal, accountEntitlements] = await Promise.all([
  db.select({
    id: telegramSignalEvents.id,
    eventId: telegramSignalEvents.eventId,
    accountNumber: telegramSignalEvents.accountNumber,
    status: telegramSignalEvents.status,
    failureCode: telegramSignalEvents.failureCode,
    failureReason: telegramSignalEvents.failureReason,
    createdAt: telegramSignalEvents.createdAt,
  }).from(telegramSignalEvents).where(eq(telegramSignalEvents.eventId, "gemini-230069105-XAUUSD-signal-1787839260")).limit(1),
  db.select({
    id: entitlements.id,
    mt5AccountNumber: entitlements.mt5AccountNumber,
    productId: entitlements.productId,
    status: entitlements.status,
    expiresAt: entitlements.expiresAt,
  }).from(entitlements).where(eq(entitlements.mt5AccountNumber, "230069105")).orderBy(desc(entitlements.createdAt)),
]);

console.log(JSON.stringify({ signal: signal[0] ?? null, entitlements: accountEntitlements }, null, 2));
process.exit(0);
