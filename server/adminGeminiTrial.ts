import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { entitlements, paymentOrders, products, users } from "../drizzle/schema";
import { getDb } from "./db";
import { issueGeminiAdminTrial } from "./masterServer";

const GEMINI_PRODUCT_ID = "gemini-bot-ea";
const ADMIN_TRIAL_LABEL = "ADMIN TRIAL — NOT CUSTOMER PURCHASE";

export async function grantGeminiAdminTrial(input: {
  adminUserId: number;
  accountNumber: string;
  durationDays: number;
}) {
  if (input.durationDays !== 7) throw new Error("Only the approved seven-day Gemini Bot admin trial is available");
  if (!/^\d{1,20}$/.test(input.accountNumber)) throw new Error("A numeric MT5 account number is required");

  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const admin = (await db.select({ id: users.id, email: users.email, role: users.role }).from(users).where(eq(users.id, input.adminUserId)).limit(1))[0];
  if (!admin || admin.role !== "admin" || !admin.email) throw new Error("An administrator account with an email is required");
  const product = (await db.select({ id: products.id, name: products.name, active: products.active, isTest: products.isTest }).from(products).where(eq(products.id, GEMINI_PRODUCT_ID)).limit(1))[0];
  if (!product || product.active !== "yes" || product.isTest !== "no") throw new Error("The production Gemini Bot EA product is unavailable");

  const existing = (await db.select({ id: entitlements.id, status: entitlements.status, source: entitlements.source }).from(entitlements).where(and(eq(entitlements.userId, admin.id), eq(entitlements.productId, GEMINI_PRODUCT_ID))).limit(1))[0];
  const retryingRevokedTrial = existing?.source === "admin_trial" && existing.status === "revoked";
  if (existing && !retryingRevokedTrial) throw new Error(`Gemini Bot entitlement already exists for this administrator (status=${existing.status}, source=${existing.source})`);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
  const orderId = `ADMINTRIAL-${nanoid(18)}`;
  const externalReference = `ADMIN-TRIAL-GEMINI-${nanoid(12).toUpperCase()}`;
  const providerReference = `ADMIN-TRIAL-NO-PAYMENT-${nanoid(12).toUpperCase()}`;

  await db.insert(paymentOrders).values({
    id: orderId,
    userId: admin.id,
    productId: GEMINI_PRODUCT_ID,
    externalReference,
    providerRefNo: providerReference,
    status: "paid",
    expectedAmountSen: 0,
    paidAmountSen: 0,
    failureReason: `${ADMIN_TRIAL_LABEL}; no ToyyibPay request or settlement occurred`,
    isAdminTrial: "yes",
    paidAt: now,
  });

  let entitlementId: number;
  if (retryingRevokedTrial && existing) {
    entitlementId = existing.id;
    await db.update(entitlements).set({ mostRecentOrderId: orderId, status: "active", source: "admin_trial", trialLabel: ADMIN_TRIAL_LABEL, startsAt: now, expiresAt, mt5AccountNumber: null, mt5BoundAt: null }).where(eq(entitlements.id, entitlementId));
  } else {
    const entitlement = await db.insert(entitlements).values({
      userId: admin.id,
      productId: GEMINI_PRODUCT_ID,
      mostRecentOrderId: orderId,
      status: "active",
      source: "admin_trial",
      trialLabel: ADMIN_TRIAL_LABEL,
      startsAt: now,
      expiresAt,
    });
    entitlementId = Number(entitlement[0].insertId);
  }

  try {
    const binding = await issueGeminiAdminTrial({ email: admin.email, clientName: admin.email, accountNumber: input.accountNumber, durationDays: 7 });
    await db.update(entitlements).set({ mt5AccountNumber: binding.account_number, mt5BoundAt: now }).where(eq(entitlements.id, entitlementId));
    return { entitlementId, orderId, productName: product.name, accountNumber: binding.account_number, startsAt: now, expiresAt, label: ADMIN_TRIAL_LABEL, masterExpiry: binding.expiry, noCharge: true as const };
  } catch (error) {
    await db.update(entitlements).set({ status: "revoked", trialLabel: `${ADMIN_TRIAL_LABEL}; binding failed and access was revoked` }).where(eq(entitlements.id, entitlementId));
    throw error;
  }
}
