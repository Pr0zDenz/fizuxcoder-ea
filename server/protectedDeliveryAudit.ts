import { and, eq, sql } from "drizzle-orm";
import { entitlements, products, protectedDeliveryAuditCycles, protectedDeliveryAuditSchedules, protectedDeliveryAudits } from "../drizzle/schema";
import { getDb } from "./db";

const MASTER_SERVER_WARNING_HEADER = "ngrok-skip-browser-warning";
const MASTER_SERVER_BASE_URL = "https://ruby-railroad-trimester.ngrok-free.dev";

export const PROTECTED_DELIVERY_AUDIT_SCHEDULE_NAME = "protected-delivery-audit-monthly";
export const PROTECTED_DELIVERY_AUDIT_PATH = "/api/scheduled/protected-delivery-audit";
export const PROTECTED_DELIVERY_AUDIT_CRON = "0 0 1 1 * *";

export function currentAuditCycleKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

function responseClass(status: number): string {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  return "5xx";
}

function normalizeBaseUrl(value: string): string {
  const baseUrl = value.trim().replace(/\/+$/, "");
  if (!baseUrl.startsWith("https://")) throw new Error("Protected-delivery audit requires an HTTPS Master Server URL.");
  return baseUrl;
}

async function probeMasterServer(baseUrl: string): Promise<{ reachable: "yes" | "no"; httpStatus: number | null; responseClass: string; failureReason: string | null }> {
  try {
    const response = await fetch(normalizeBaseUrl(baseUrl), {
      method: "GET",
      headers: { [MASTER_SERVER_WARNING_HEADER]: "1" },
      signal: AbortSignal.timeout(10_000),
    });
    return { reachable: "yes", httpStatus: response.status, responseClass: responseClass(response.status), failureReason: null };
  } catch {
    return { reachable: "no", httpStatus: null, responseClass: "network-error", failureReason: "Master Server HTTPS endpoint was unreachable." };
  }
}

export async function ensureProtectedDeliveryAuditScheduleRow() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for the protected-delivery audit.");
  const existing = await db.select().from(protectedDeliveryAuditSchedules).where(eq(protectedDeliveryAuditSchedules.scheduleName, PROTECTED_DELIVERY_AUDIT_SCHEDULE_NAME)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(protectedDeliveryAuditSchedules).values({
    scheduleName: PROTECTED_DELIVERY_AUDIT_SCHEDULE_NAME,
    masterServerBaseUrl: MASTER_SERVER_BASE_URL,
    enabled: "yes",
  });
  const created = await db.select().from(protectedDeliveryAuditSchedules).where(eq(protectedDeliveryAuditSchedules.scheduleName, PROTECTED_DELIVERY_AUDIT_SCHEDULE_NAME)).limit(1);
  if (!created[0]) throw new Error("Protected-delivery audit schedule row was not created.");
  return created[0];
}

export async function attachProtectedDeliveryAuditTaskUid(taskUid: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for the protected-delivery audit.");
  await db.update(protectedDeliveryAuditSchedules)
    .set({ scheduleCronTaskUid: taskUid })
    .where(eq(protectedDeliveryAuditSchedules.scheduleName, PROTECTED_DELIVERY_AUDIT_SCHEDULE_NAME));
}

export async function runProtectedDeliveryAudit(scheduleId: number, cycleKey = currentAuditCycleKey()): Promise<{ cycleId: number; status: "completed" | "skipped"; cycleKey: string; masterServerReachable: "yes" | "no" }> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for the protected-delivery audit.");
  const schedule = (await db.select().from(protectedDeliveryAuditSchedules).where(eq(protectedDeliveryAuditSchedules.id, scheduleId)).limit(1))[0];
  if (!schedule || schedule.enabled !== "yes") return { cycleId: 0, status: "skipped", cycleKey, masterServerReachable: "no" };

  const prior = (await db.select().from(protectedDeliveryAuditCycles).where(and(eq(protectedDeliveryAuditCycles.scheduleId, scheduleId), eq(protectedDeliveryAuditCycles.cycleKey, cycleKey))).limit(1))[0];
  if (prior && prior.status !== "failed") return { cycleId: prior.id, status: "skipped", cycleKey, masterServerReachable: prior.masterServerReachable };

  let cycleId = prior?.id;
  if (!cycleId) {
    const inserted = await db.insert(protectedDeliveryAuditCycles).values({ scheduleId, cycleKey, status: "running" });
    cycleId = Number(inserted[0].insertId);
  } else {
    await db.update(protectedDeliveryAuditCycles).set({ status: "running", failureReason: null, completedAt: null }).where(eq(protectedDeliveryAuditCycles.id, cycleId));
  }

  try {
    const [deliveryCount] = await db.select({ count: sql<number>`count(*)` })
      .from(protectedDeliveryAudits)
      .innerJoin(products, eq(products.id, protectedDeliveryAudits.productId))
      .where(eq(products.isTest, "no"));
    const [activeEntitlementCount] = await db.select({ count: sql<number>`count(*)` })
      .from(entitlements)
      .innerJoin(products, eq(products.id, entitlements.productId))
      .where(and(eq(products.isTest, "no"), eq(entitlements.status, "active")));
    const probe = await probeMasterServer(schedule.masterServerBaseUrl);
    await db.update(protectedDeliveryAuditCycles).set({
      status: "completed",
      localDeliveryAuditCount: Number(deliveryCount?.count ?? 0),
      activeProductionEntitlementCount: Number(activeEntitlementCount?.count ?? 0),
      masterServerHttpStatus: probe.httpStatus,
      masterServerReachable: probe.reachable,
      masterServerResponseClass: probe.responseClass,
      failureReason: probe.failureReason,
      completedAt: new Date(),
    }).where(eq(protectedDeliveryAuditCycles.id, cycleId));
    return { cycleId, status: "completed", cycleKey, masterServerReachable: probe.reachable };
  } catch (error) {
    await db.update(protectedDeliveryAuditCycles).set({ status: "failed", failureReason: "Protected-delivery audit failed before completion." }).where(eq(protectedDeliveryAuditCycles.id, cycleId));
    throw error;
  }
}

export function getConfiguredMasterServerBaseUrl(): string {
  return MASTER_SERVER_BASE_URL;
}
