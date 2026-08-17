import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { entitlements, paymentOrders, productFiles, products } from "../drizzle/schema";
import { getDb } from "./db";
import { bindMasterServerLicence } from "./masterServer";
import { callbackAmountToSen, getSuccessfulBillTransactions } from "./toyyibpay";

export const PRODUCT_IDS = {
  threeS: "3s-universal-ea",
  gemini: "gemini-bot-ea",
  geminiLiveTest: "test-gemini-bot-ea",
} as const;

export const DIRECT_TOYYIBPAY_LINKS: Record<string, string> = {
  "gemini-bot-ea": "https://toyyibpay.com/t1rvxbft",
  "3s-universal-ea": "https://toyyibpay.com/3-Serangkai-EA",
  "test-gemini-bot-ea": "https://toyyibpay.com/TEST-Gemini-Bot-EA",
};

const DIRECT_TOYYIBPAY_BILL_CODES: Record<string, string> = {
  "gemini-bot-ea": "t1rvxbft",
  "3s-universal-ea": "3-Serangkai-EA",
  "test-gemini-bot-ea": "TEST-Gemini-Bot-EA",
};

export function getRequestOrigin(req: { protocol?: string; get: (name: string) => string | undefined; headers: Record<string, unknown> }) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0] : req.protocol ?? "https";
  const host = req.get("x-forwarded-host") ?? req.get("host");
  if (!host || host.includes("localhost")) throw new Error("Checkout must be started from a public website address");
  return `${protocol}://${host}`;
}

export async function getCatalog() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const catalog = await db.select({
    id: products.id,
    name: products.name,
    description: products.description,
    priceSen: products.priceSen,
    originalPriceSen: products.originalPriceSen,
    currency: products.currency,
    billingCycle: products.billingCycle,
  }).from(products).where(and(eq(products.active, "yes"), eq(products.isTest, "no")));
  return catalog.map(product => ({ ...product, directCheckoutUrl: DIRECT_TOYYIBPAY_LINKS[product.id] }));
}

export async function getTestCatalog() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const catalog = await db.select({
    id: products.id,
    name: products.name,
    description: products.description,
    priceSen: products.priceSen,
    currency: products.currency,
    billingCycle: products.billingCycle,
  }).from(products).where(and(eq(products.active, "yes"), eq(products.isTest, "yes")));
  return catalog.map(product => ({ ...product, directCheckoutUrl: DIRECT_TOYYIBPAY_LINKS[product.id] }));
}

export async function beginPaymentOrder(input: { userId: number; productId: string; referencePrefix?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const product = (await db.select().from(products).where(eq(products.id, input.productId)).limit(1))[0];
  if (!product || product.active !== "yes") throw new Error("This product is not currently available");
  const id = nanoid(18);
  const externalReference = `${input.referencePrefix ?? "FZ"}-${nanoid(14).toUpperCase()}`;
  await db.insert(paymentOrders).values({
    id,
    userId: input.userId,
    productId: product.id,
    externalReference,
    expectedAmountSen: product.priceSen,
    status: "pending",
  });
  return { orderId: id, externalReference, product };
}

export async function attachProviderBill(orderId: string, billCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(paymentOrders).set({ providerBillCode: billCode }).where(eq(paymentOrders.id, orderId));
}

export async function removePendingOrder(orderId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(paymentOrders).where(eq(paymentOrders.id, orderId));
}

export async function recordPaymentCallback(input: {
  externalReference: string;
  billCode?: string;
  refNo: string;
  status: string;
  amountSen: number | null;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const order = (await db.select().from(paymentOrders).where(eq(paymentOrders.externalReference, input.externalReference)).limit(1))[0];
  if (!order) return { accepted: false };
  if (order.providerBillCode !== input.billCode) return { accepted: false };

  if (input.status === "1") {
    if (input.amountSen !== order.expectedAmountSen) return { accepted: false };
    if (order.status === "paid") return { accepted: true };
    const product = (await db.select().from(products).where(eq(products.id, order.productId)).limit(1))[0];
    if (!product) throw new Error("Order product is unavailable");
    const now = new Date();
    const expiresAt = product.isTest === "yes" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : product.billingCycle === "monthly" ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
    await db.update(paymentOrders).set({ status: "paid", providerRefNo: input.refNo, paidAmountSen: input.amountSen, paidAt: now }).where(eq(paymentOrders.id, order.id));
    await db.insert(entitlements).values({
      userId: order.userId,
      productId: order.productId,
      mostRecentOrderId: order.id,
      status: "active",
      startsAt: now,
      expiresAt,
    }).onDuplicateKeyUpdate({
      set: { mostRecentOrderId: order.id, status: "active", startsAt: now, expiresAt },
    });
    return { accepted: true };
  }

  if (input.status === "3") {
    await db.update(paymentOrders).set({ status: "failed", providerRefNo: input.refNo, failureReason: input.reason ?? "Payment failed" }).where(eq(paymentOrders.id, order.id));
    return { accepted: true };
  }
  return { accepted: true };
}

export async function getCustomerLibrary(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ entitlement: entitlements, product: products }).from(entitlements).innerJoin(products, eq(entitlements.productId, products.id)).where(eq(entitlements.userId, userId));
  const now = new Date();
  return Promise.all(rows.map(async ({ entitlement, product }) => {
    const active = entitlement.status === "active" && (!entitlement.expiresAt || entitlement.expiresAt > now);
    if (!active && entitlement.status === "active" && entitlement.expiresAt && entitlement.expiresAt <= now) {
      await db.update(entitlements).set({ status: "expired" }).where(eq(entitlements.id, entitlement.id));
    }
    const files = active ? await db.select({ id: productFiles.id, displayName: productFiles.displayName, fileName: productFiles.fileName }).from(productFiles).where(eq(productFiles.productId, product.id)) : [];
    return { productId: product.id, productName: product.name, billingCycle: product.billingCycle, status: active ? "active" as const : "expired" as const, expiresAt: entitlement.expiresAt, mt5AccountNumber: entitlement.mt5AccountNumber, mt5BoundAt: entitlement.mt5BoundAt, files };
  }));
}

export async function bindCustomerMt5Account(input: { userId: number; userEmail: string; productId: string; accountNumber: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const record = (await db.select({ entitlement: entitlements, product: products })
    .from(entitlements)
    .innerJoin(products, eq(entitlements.productId, products.id))
    .where(and(eq(entitlements.userId, input.userId), eq(entitlements.productId, input.productId)))
    .limit(1))[0];
  const now = new Date();
  const isActive = record?.entitlement.status === "active" && (!record.entitlement.expiresAt || record.entitlement.expiresAt > now);
  if (!record || !isActive) throw new Error("An active verified purchase is required before an MT5 account can be bound");

  const binding = await bindMasterServerLicence({
    email: input.userEmail,
    productId: input.productId,
    accountNumber: input.accountNumber,
  });
  await db.update(entitlements).set({ mt5AccountNumber: binding.account_number, mt5BoundAt: now }).where(eq(entitlements.id, record.entitlement.id));
  return {
    productName: record.product.name,
    accountNumber: binding.account_number,
    replacedAccount: binding.replaced_account ?? null,
    expiry: binding.expiry ?? null,
  };
}

export async function getCustomerOrderStatus(userId: number, externalReference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const order = (await db.select({ order: paymentOrders, product: products }).from(paymentOrders).innerJoin(products, eq(paymentOrders.productId, products.id)).where(and(eq(paymentOrders.userId, userId), eq(paymentOrders.externalReference, externalReference))).limit(1))[0];
  if (!order) return null;
  return { productName: order.product.name, status: order.order.status, failureReason: order.order.failureReason, paidAt: order.order.paidAt };
}

export async function claimPermanentBillPayment(input: { userId: number; userEmail: string; productId: string; receiptNo: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const product = (await db.select().from(products).where(eq(products.id, input.productId)).limit(1))[0];
  let billCode = DIRECT_TOYYIBPAY_BILL_CODES[input.productId];
  let dynamicTestOrder: { id: string } | undefined;
  if (!product || product.active !== "yes") throw new Error("This package is not currently available for payment claiming");
  if (product.isTest === "yes") {
    const pending = await db.select({ id: paymentOrders.id, providerBillCode: paymentOrders.providerBillCode }).from(paymentOrders).where(and(eq(paymentOrders.userId, input.userId), eq(paymentOrders.productId, product.id), eq(paymentOrders.status, "pending"))).limit(1);
    if (pending.length && pending[0].providerBillCode) {
      dynamicTestOrder = { id: pending[0].id };
      billCode = pending[0].providerBillCode;
    }
  }
  if (!billCode) throw new Error("This package is not currently available for payment claiming");

  const receiptNo = input.receiptNo.trim();
  const transactions = await getSuccessfulBillTransactions(billCode);
  const transaction = transactions.find(item => item.billpaymentStatus === "1" && (item.billpaymentInvoiceNo === receiptNo || item.SettlementReferenceNo === receiptNo));
  if (!transaction) throw new Error("No successful payment was found for that ToyyibPay receipt number");
  if (!transaction.billEmail || transaction.billEmail.trim().toLowerCase() !== input.userEmail.trim().toLowerCase()) {
    throw new Error("The ToyyibPay receipt email must match the email of the signed-in portal account");
  }
  const amountSen = callbackAmountToSen(transaction.billpaymentAmount);
  if (amountSen !== product.priceSen) throw new Error("The confirmed payment amount does not match this package");
  const invoiceNo = transaction.billpaymentInvoiceNo ?? receiptNo;
  const alreadyClaimed = await db.select({ id: paymentOrders.id }).from(paymentOrders).where(eq(paymentOrders.providerRefNo, invoiceNo)).limit(1);
  if (alreadyClaimed.length) throw new Error("This ToyyibPay receipt has already been claimed");

  const now = new Date();
  const orderId = dynamicTestOrder?.id ?? nanoid(18);
  const expiresAt = product.isTest === "yes" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : product.billingCycle === "monthly" ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  if (dynamicTestOrder) {
    await db.update(paymentOrders).set({ providerRefNo: invoiceNo, status: "paid", paidAmountSen: amountSen, paidAt: now }).where(eq(paymentOrders.id, orderId));
  } else {
    await db.insert(paymentOrders).values({
      id: orderId,
      userId: input.userId,
      productId: product.id,
      externalReference: `CLAIM-${nanoid(14).toUpperCase()}`,
      providerBillCode: billCode,
      providerRefNo: invoiceNo,
      status: "paid",
      expectedAmountSen: product.priceSen,
      paidAmountSen: amountSen,
      paidAt: now,
    });
  }
  await db.insert(entitlements).values({
    userId: input.userId,
    productId: product.id,
    mostRecentOrderId: orderId,
    status: "active",
    startsAt: now,
    expiresAt,
  }).onDuplicateKeyUpdate({ set: { mostRecentOrderId: orderId, status: "active", startsAt: now, expiresAt } });
  return { productName: product.name, billingCycle: product.billingCycle };
}

export async function getSecureFileForCustomer(input: { userId: number; fileId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const file = (await db.select({ file: productFiles, entitlement: entitlements }).from(productFiles).innerJoin(entitlements, eq(productFiles.productId, entitlements.productId)).where(and(eq(productFiles.id, input.fileId), eq(entitlements.userId, input.userId))).limit(1))[0];
  if (!file || file.entitlement.status !== "active" || (file.entitlement.expiresAt && file.entitlement.expiresAt <= new Date())) {
    throw new Error("No active entitlement for this download");
  }
  return file.file;
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export function packageStorageKey(productId: string, fileName: string) {
  const suffix = createHash("sha256").update(`${productId}:${fileName}:${Date.now()}`).digest("hex").slice(0, 12);
  return `protected-packages/${productId}/${suffix}-${safeFileName(fileName)}`;
}
