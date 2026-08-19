import { eq } from "drizzle-orm";
import { buyerEmailDeliveries } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { getStoredGmailRefreshToken } from "./gmailOAuth";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const PORTAL_GUIDE_URL = "https://fizuxea-jxctlods.manus.space/portal#installation-guide";

export type BuyerEmailDeliveryStatus = "sent" | "already_sent" | "not_authorized" | "failed" | "not_eligible";

type BuyerActivationEmail = {
  recipientEmail: string;
  productName: string;
  billingCycle: "monthly" | "lifetime";
};

type ProductEmailGuidance = {
  packageSummary: string;
  setupNote: string;
  updateNote: string;
};

function productEmailGuidance(productName: string): ProductEmailGuidance {
  if (/gemini/i.test(productName)) {
    return {
      packageSummary: "Your Gemini package includes Gemini Bot EA v11.97, FizuxCoder News Calendar v5.00 Tradays, and FMCBR Fractal.",
      setupNote: "Install Gemini Bot EA in MQL5\\Experts and the News Calendar plus FMCBR Fractal components in MQL5\\Indicators before restarting MT5.",
      updateNote: "For Gemini updates, close the active chart instance before replacing the named EA or supporting component with the release listed in your portal.",
    };
  }
  if (/3s|serangkai/i.test(productName)) {
    return {
      packageSummary: "Your 3S package includes 3SUniversalEA, DT3 ZigZag LauerX, 3S Basket Dashboard, 3S Matrix Dashboard, Tradays News Calendar, Trade History, and FMCBR Fractal.",
      setupNote: "Install 3SUniversalEA in MQL5\\Experts and each listed supporting component in MQL5\\Indicators before restarting MT5.",
      updateNote: "For 3S updates, remove or close the previous chart instance before installing the replacement release and any supporting files named in its release note.",
    };
  }
  return {
    packageSummary: "Your protected package contains the files listed in your active portal library.",
    setupNote: "Follow the installation steps shown in the portal before attaching the EA to an MT5 chart.",
    updateNote: "For updates, replace only the files identified in the release note after closing the active EA chart instance.",
  };
}

function gmailConfig() {
  if (!ENV.gmailOauthClientId || !ENV.gmailOauthClientSecret || !ENV.gmailSenderEmail) {
    throw new Error("Gmail sender configuration is incomplete");
  }
  return {
    clientId: ENV.gmailOauthClientId,
    clientSecret: ENV.gmailOauthClientSecret,
    senderEmail: ENV.gmailSenderEmail.trim().toLowerCase(),
  };
}

export function buildBuyerActivationEmail(input: BuyerActivationEmail) {
  const cycleLabel = input.billingCycle === "monthly" ? "monthly access" : "lifetime access";
  const guidance = productEmailGuidance(input.productName);
  const subject = `${input.productName} — your protected portal access is active`;
  const text = [
    "FizuxCoder buyer access confirmation",
    "",
    `Your verified payment claim for ${input.productName} is complete. Your ${cycleLabel} is now active in the FizuxCoder Customer Portal.`,
    "",
    guidance.packageSummary,
    guidance.setupNote,
    guidance.updateNote,
    "",
    "Next steps:",
    "1. Sign in to the portal with this email address.",
    "2. Open Your eligible downloads and select the active product.",
    "3. Bind the numeric MT5 account that will run the EA. You may re-bind later; the old account is removed.",
    "4. Download only the files listed for your active product and follow the installation guide.",
    "",
    `Open your portal and installation guide: ${PORTAL_GUIDE_URL}`,
    "",
    "Risk notice: Automated trading carries risk. Review the EA settings, broker conditions, and risk disclosures before use.",
    "",
    "This is an automatic service notice from FizuxCoder. Do not reply with passwords, payment-card data, or MT5 login credentials.",
  ].join("\r\n");
  return { subject, text };
}

export function toGmailRawMessage(input: { from: string; to: string; subject: string; text: string }) {
  const message = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
  ].join("\r\n");
  return Buffer.from(message, "utf8").toString("base64url");
}

async function getAccessToken(fetchFn: typeof fetch) {
  const refreshToken = await getStoredGmailRefreshToken();
  if (!refreshToken) return null;
  const { clientId, clientSecret } = gmailConfig();
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json() as { access_token?: string };
  if (!response.ok || !payload.access_token) throw new Error("GMAIL_TOKEN_REFRESH_FAILED");
  return payload.access_token;
}

export async function sendGmailBuyerActivationEmail(input: BuyerActivationEmail, fetchFn: typeof fetch = fetch) {
  const accessToken = await getAccessToken(fetchFn);
  if (!accessToken) return { status: "not_authorized" as const };
  const { senderEmail } = gmailConfig();
  const message = buildBuyerActivationEmail(input);
  const response = await fetchFn(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw: toGmailRawMessage({ from: senderEmail, to: input.recipientEmail, ...message }) }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string };
  if (!response.ok || !payload.id) throw new Error("GMAIL_SEND_FAILED");
  return { status: "sent" as const, providerMessageId: payload.id };
}

export async function deliverBuyerActivationEmail(input: {
  userId: number;
  orderId: string;
  productId: string;
  productName: string;
  billingCycle: "monthly" | "lifetime";
  recipientEmail: string;
  isTest: "yes" | "no";
}, dependencies: {
  getDatabase?: typeof getDb;
  sendActivationEmail?: typeof sendGmailBuyerActivationEmail;
} = {}) {
  if (input.isTest === "yes") return { status: "not_eligible" as const };
  const db = await (dependencies.getDatabase ?? getDb)();
  if (!db) throw new Error("Database is unavailable");
  const existing = (await db.select().from(buyerEmailDeliveries).where(eq(buyerEmailDeliveries.orderId, input.orderId)).limit(1))[0];
  if (existing?.status === "sent") return { status: "already_sent" as const };

  try {
    const outcome = await (dependencies.sendActivationEmail ?? sendGmailBuyerActivationEmail)({
      recipientEmail: input.recipientEmail,
      productName: input.productName,
      billingCycle: input.billingCycle,
    });
    if (outcome.status === "not_authorized") return outcome;
    await db.insert(buyerEmailDeliveries).values({
      userId: input.userId,
      orderId: input.orderId,
      productId: input.productId,
      recipientEmail: input.recipientEmail,
      status: "sent",
      providerMessageId: outcome.providerMessageId,
      sentAt: new Date(),
    }).onDuplicateKeyUpdate({
      set: { status: "sent", providerMessageId: outcome.providerMessageId, failureCode: null, sentAt: new Date() },
    });
    return { status: "sent" as const };
  } catch (error) {
    const failureCode = error instanceof Error && /^GMAIL_[A-Z_]+$/.test(error.message) ? error.message : "GMAIL_DELIVERY_FAILED";
    await db.insert(buyerEmailDeliveries).values({
      userId: input.userId,
      orderId: input.orderId,
      productId: input.productId,
      recipientEmail: input.recipientEmail,
      status: "failed",
      failureCode,
    }).onDuplicateKeyUpdate({
      set: { status: "failed", providerMessageId: null, failureCode, sentAt: null },
    });
    return { status: "failed" as const };
  }
}
