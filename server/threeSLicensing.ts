import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { threeSLicenceIssuances } from "../drizzle/schema";
import { getDb } from "./db";
import { sendGmailThreeSLicenceActivationEmail } from "./gmailSender";
import { issueMasterServerThreeSLicence } from "./masterServer";

const hashActivationCode = (value: string) => createHash("sha256").update(value).digest("hex");

function licenceIdForOrder(orderId: string) {
  const normalized = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 72);
  if (!normalized) throw new Error("The verified 3S order identifier is invalid.");
  return `3S-${normalized}`;
}

export type ThreeSLicenceIssueOutcome = {
  accountNumber: string;
  apiExpiry: string | null;
  status: "issued" | "already_issued" | "delivery_failed" | "requires_support";
};

/**
 * Issues exactly one initial one-year 3S API licence for a verified portal
 * entitlement. The portal does not store plaintext activation codes. A failed
 * send is fail-closed: support must handle renewal/recovery rather than the
 * portal creating a second active Master Server licence.
 */
export async function issueThreeSLicenceAfterVerifiedBinding(input: {
  userId: number;
  entitlementId: number;
  orderId: string;
  productId: "3s-universal-ea";
  customerName: string;
  recipientEmail: string;
  accountNumber: string;
}, dependencies: {
  getDatabase?: typeof getDb;
  issueLicence?: typeof issueMasterServerThreeSLicence;
  sendActivationEmail?: typeof sendGmailThreeSLicenceActivationEmail;
} = {}): Promise<ThreeSLicenceIssueOutcome> {
  const db = await (dependencies.getDatabase ?? getDb)();
  if (!db) throw new Error("Database is unavailable");
  const existing = (await db.select().from(threeSLicenceIssuances).where(eq(threeSLicenceIssuances.entitlementId, input.entitlementId)).limit(1))[0];
  if (existing) {
    if (existing.mt5AccountNumber !== input.accountNumber) {
      throw new Error("Your 3S API licence is already attached to a different MT5 account. Please contact FizuxCoder support to change the account safely.");
    }
    if (existing.status === "issued") return { accountNumber: existing.mt5AccountNumber, apiExpiry: existing.apiExpiresAt?.toISOString().slice(0, 10) ?? null, status: "already_issued" };
    return { accountNumber: existing.mt5AccountNumber, apiExpiry: existing.apiExpiresAt?.toISOString().slice(0, 10) ?? null, status: existing.status === "delivery_failed" ? "delivery_failed" : "requires_support" };
  }

  const licenseId = licenceIdForOrder(input.orderId);
  await db.insert(threeSLicenceIssuances).values({
    userId: input.userId,
    entitlementId: input.entitlementId,
    orderId: input.orderId,
    productId: input.productId,
    licenseId,
    mt5AccountNumber: input.accountNumber,
    status: "issuing",
  });

  let issued: Awaited<ReturnType<typeof issueMasterServerThreeSLicence>>;
  try {
    issued = await (dependencies.issueLicence ?? issueMasterServerThreeSLicence)({
      licenseId,
      clientName: input.customerName.slice(0, 160) || "3S Universal Customer",
      accountNumber: input.accountNumber,
    });
  } catch {
    await db.update(threeSLicenceIssuances).set({ status: "issuer_failed", failureCode: "MASTER_SERVER_ISSUER_FAILED" }).where(eq(threeSLicenceIssuances.entitlementId, input.entitlementId));
    throw new Error("The 3S activation service could not issue a licence. No new activation email was sent; please contact FizuxCoder support.");
  }

  if (issued.license_id !== licenseId || issued.account_number !== input.accountNumber) {
    await db.update(threeSLicenceIssuances).set({ status: "issuer_failed", failureCode: "MASTER_SERVER_ISSUER_RESPONSE_MISMATCH" }).where(eq(threeSLicenceIssuances.entitlementId, input.entitlementId));
    throw new Error("The 3S activation service returned mismatched licence details. No activation email was sent; please contact FizuxCoder support.");
  }

  const apiExpiresAt = new Date(`${issued.expiry}T00:00:00.000Z`);
  await db.update(threeSLicenceIssuances).set({ activationCodeHash: hashActivationCode(issued.activation_code), apiExpiresAt, issuedAt: new Date() }).where(eq(threeSLicenceIssuances.entitlementId, input.entitlementId));

  try {
    const delivery = await (dependencies.sendActivationEmail ?? sendGmailThreeSLicenceActivationEmail)({
      recipientEmail: input.recipientEmail,
      licenseId: issued.license_id,
      activationCode: issued.activation_code,
      accountNumber: issued.account_number,
      apiExpiry: issued.expiry,
    });
    if (delivery.status === "not_authorized") {
      await db.update(threeSLicenceIssuances).set({ status: "delivery_failed", failureCode: "GMAIL_NOT_AUTHORIZED" }).where(eq(threeSLicenceIssuances.entitlementId, input.entitlementId));
      return { accountNumber: issued.account_number, apiExpiry: issued.expiry, status: "delivery_failed" };
    }
    await db.update(threeSLicenceIssuances).set({ status: "issued", providerMessageId: delivery.providerMessageId, emailedAt: new Date() }).where(eq(threeSLicenceIssuances.entitlementId, input.entitlementId));
    return { accountNumber: issued.account_number, apiExpiry: issued.expiry, status: "issued" };
  } catch {
    await db.update(threeSLicenceIssuances).set({ status: "delivery_failed", failureCode: "GMAIL_SEND_FAILED" }).where(eq(threeSLicenceIssuances.entitlementId, input.entitlementId));
    return { accountNumber: issued.account_number, apiExpiry: issued.expiry, status: "delivery_failed" };
  }
}
