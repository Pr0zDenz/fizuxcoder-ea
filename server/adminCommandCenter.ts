import { desc, sql } from "drizzle-orm";
import { buyerEmailDeliveries, entitlements, marketingContentItems, paymentOrders, products, protectedDeliveryAuditCycles, protectedDeliveryAudits } from "../drizzle/schema";
import { getDb } from "./db";
import { getTelegramSignalDashboard } from "./telegramSignals";

type DateValue = Date | null | undefined;

function newest<T extends { startedAt?: DateValue; createdAt?: DateValue }>(items: T[]) {
  return [...items].sort((a, b) => Number((b.startedAt ?? b.createdAt ?? new Date(0)).getTime()) - Number((a.startedAt ?? a.createdAt ?? new Date(0)).getTime()))[0];
}

function displayDate(value: DateValue) {
  return value ? value.toISOString() : null;
}

export function summarizeAdminCommandCenter(input: {
  products: { id: string; active: "yes" | "no"; isTest: "yes" | "no" }[];
  entitlements: { status: "active" | "expired" | "revoked"; mt5AccountNumber: string | null }[];
  orders: { status: "pending" | "paid" | "failed" | "expired" }[];
  downloads: { deliveredAt: Date }[];
  emails: { status: "sent" | "failed" }[];
  marketingCounts: { status: "draft" | "approved" | "publish_pending" | "publish_failed" | "posted" | "rejected"; count: number }[];
  recentMarketing: { id: number; title: string; status: "draft" | "approved" | "publish_pending" | "publish_failed" | "posted" | "rejected"; createdAt: Date }[];
  auditCycles: { status: "running" | "completed" | "failed" | "skipped"; masterServerReachable: "yes" | "no"; masterServerHttpStatus: number | null; startedAt: Date; completedAt: Date | null; failureReason: string | null }[];
}) {
  const productionProducts = input.products.filter(product => product.isTest === "no");
  const latestAudit = newest(input.auditCycles);
  const recentMarketing = input.recentMarketing
    .map(item => ({ id: item.id, title: item.title, status: item.status, createdAt: item.createdAt.toISOString() }));
  const marketingCount = (status: "draft" | "approved" | "publish_pending" | "publish_failed" | "posted" | "rejected") => input.marketingCounts.find(item => item.status === status)?.count ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    products: { live: productionProducts.filter(product => product.active === "yes").length, paused: productionProducts.filter(product => product.active === "no").length },
    entitlements: {
      active: input.entitlements.filter(item => item.status === "active").length,
      expired: input.entitlements.filter(item => item.status === "expired").length,
      revoked: input.entitlements.filter(item => item.status === "revoked").length,
      boundMt5: input.entitlements.filter(item => item.status === "active" && Boolean(item.mt5AccountNumber)).length,
    },
    payments: {
      paid: input.orders.filter(item => item.status === "paid").length,
      pending: input.orders.filter(item => item.status === "pending").length,
      failed: input.orders.filter(item => item.status === "failed").length,
    },
    fulfilment: {
      protectedDownloads: input.downloads.length,
      emailsSent: input.emails.filter(item => item.status === "sent").length,
      emailsFailed: input.emails.filter(item => item.status === "failed").length,
    },
    marketing: {
      draft: marketingCount("draft"),
      queued: marketingCount("approved") + marketingCount("publish_pending"),
      posted: marketingCount("posted"),
      failed: marketingCount("publish_failed"),
      recent: recentMarketing,
    },
    masterServer: latestAudit ? {
      status: latestAudit.status,
      reachable: latestAudit.masterServerReachable === "yes",
      httpStatus: latestAudit.masterServerHttpStatus,
      checkedAt: displayDate(latestAudit.completedAt ?? latestAudit.startedAt),
      failureReason: latestAudit.failureReason,
    } : { status: "not_recorded" as const, reachable: false, httpStatus: null, checkedAt: null, failureReason: "No delivery-audit cycle is recorded yet." },
    telegram: {
      state: "not_configured" as const,
      automaticDeliveryEnabled: false,
      message: "Telegram signal delivery is not configured. No EA signal can be posted until the bot credentials, channel identity, validation rules, and kill switch are enabled.",
    },
  };
}

export async function getAdminCommandCenterSnapshot() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const [productRows, entitlementRows, orderRows, downloadRows, emailRows, marketingCounts, recentMarketing, auditRows, telegram] = await Promise.all([
    db.select({ id: products.id, active: products.active, isTest: products.isTest }).from(products),
    db.select({ status: entitlements.status, mt5AccountNumber: entitlements.mt5AccountNumber }).from(entitlements),
    db.select({ status: paymentOrders.status }).from(paymentOrders),
    db.select({ deliveredAt: protectedDeliveryAudits.deliveredAt }).from(protectedDeliveryAudits),
    db.select({ status: buyerEmailDeliveries.status }).from(buyerEmailDeliveries),
    db.select({ status: marketingContentItems.status, count: sql<number>`count(*)` }).from(marketingContentItems).groupBy(marketingContentItems.status),
    db.select({ id: marketingContentItems.id, title: marketingContentItems.title, status: marketingContentItems.status, createdAt: marketingContentItems.createdAt }).from(marketingContentItems).orderBy(desc(marketingContentItems.createdAt)).limit(6),
    db.select({ status: protectedDeliveryAuditCycles.status, masterServerReachable: protectedDeliveryAuditCycles.masterServerReachable, masterServerHttpStatus: protectedDeliveryAuditCycles.masterServerHttpStatus, startedAt: protectedDeliveryAuditCycles.startedAt, completedAt: protectedDeliveryAuditCycles.completedAt, failureReason: protectedDeliveryAuditCycles.failureReason }).from(protectedDeliveryAuditCycles),
    getTelegramSignalDashboard(),
  ]);

  const summary = summarizeAdminCommandCenter({
    products: productRows,
    entitlements: entitlementRows,
    orders: orderRows,
    downloads: downloadRows,
    emails: emailRows,
    marketingCounts: marketingCounts.map(item => ({ ...item, count: Number(item.count) })),
    recentMarketing,
    auditCycles: auditRows,
  });
  return { ...summary, telegram };
}
