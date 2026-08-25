import { and, asc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { marketingContentAudits, marketingContentItems } from "../drizzle/schema";
import { getDb } from "./db";

export const MARKETING_RISK_NOTICE = "Automated trading carries risk. Review the system and risk notes before deciding.";

export type MarketingDraftSeed = {
  contentKey: string;
  title: string;
  caption: string;
  language: "en" | "en_ms";
  assetUrl?: string;
  assetAlt?: string;
  destinationUrl?: string;
  dayOffset: number;
};

const studioDestination = "https://fizuxea-jxctlods.manus.space/#systems";

export const TWO_WEEK_THREADS_PILOT: MarketingDraftSeed[] = [
  { contentKey: "threads-pilot-01-automation-risk", title: "Automation is not a shortcut around risk", language: "en_ms", dayOffset: 1, caption: "Automation is not a shortcut around risk. It is a way to execute a defined process consistently—when you understand the process. FizuxCoder is built around MT5 setup, protected delivery, account binding, and a demo-first workflow. Study the system before you configure it. Automation bukan jaminan keuntungan." },
  { contentKey: "threads-pilot-02-demo-checklist", title: "Four checks before demo", language: "en", dayOffset: 2, assetUrl: "/manus-storage/fizuxcoder-setup-before-automation_c6fcf272.png", assetAlt: "Setup before automation checklist graphic", caption: "Before attaching any EA to a live chart, check four things: broker symbol, MT5 permissions, risk settings, and a demo test. A setup checklist may be less exciting than a profit screenshot—but it is far more useful." },
  { contentKey: "threads-pilot-03-product-workflows", title: "Choose the workflow you can operate", language: "en", dayOffset: 3, caption: "Gemini Bot EA and 3S Universal EA do not share the same operating flow. Gemini uses account-based verification. 3S uses a portal-issued one-time activation and a one-year API licence. Choose the workflow you can operate responsibly." },
  { contentKey: "threads-pilot-04-delivery-workflow", title: "What happens after verified payment", language: "en", dayOffset: 4, assetUrl: "/manus-storage/fizuxcoder-protected-delivery-workflow_054dfa57.png", assetAlt: "Verified receipt to installation guide workflow", caption: "What happens after verified payment? Claim the receipt in the portal, bind the intended MT5 account, access the protected package, then follow the installation guide. Clear steps. No shared download links." },
  { contentKey: "threads-pilot-05-risk-control", title: "An EA cannot remove operating risk", language: "en", dayOffset: 5, caption: "A trading EA executes programmed rules. It cannot remove volatility, slippage, broker conditions, connectivity issues, or loss. If you cannot explain your setup, do not automate it live yet." },
  { contentKey: "threads-pilot-06-protected-delivery", title: "Software delivery should be protected", language: "en", dayOffset: 8, assetUrl: "/manus-storage/fizuxcoder-protected-delivery-workflow_054dfa57.png", assetAlt: "Protected EA delivery workflow graphic", caption: "Product delivery should be treated like software delivery: verified payment, account-bound access, documented versioning, and a clear installation guide. That is why FizuxCoder does not use open public package links." },
  { contentKey: "threads-pilot-07-separate-decisions", title: "Keep product and broker decisions separate", language: "en", dayOffset: 9, caption: "Optional broker referrals and EA purchases are separate decisions. Use a broker and product only after reviewing their terms, risk disclosures, and suitability for your own circumstances." },
  { contentKey: "threads-pilot-08-demo-first", title: "Demo first", language: "en", dayOffset: 10, assetUrl: "/manus-storage/fizuxcoder-risk-first-video-cover_659d4e34.png", assetAlt: "Automation does not remove risk video cover", caption: "Demo first. Verify your MT5 environment, attach only after setup review, then monitor and own the risk. A setup checklist is part of the process—not a disclaimer at the bottom of the page." },
  { contentKey: "threads-pilot-09-documentation", title: "Good automation documentation answers practical questions", language: "en", dayOffset: 11, caption: "Good automation documentation answers practical questions: where files go, what a licence binds to, what WebRequest permissions are needed, and what happens when access expires. That is the standard we are building for." },
  { contentKey: "threads-pilot-10-right-question", title: "Ask the right question", language: "en", dayOffset: 12, assetUrl: "/manus-storage/fizuxcoder-risk-first-video-cover_659d4e34.png", assetAlt: "Risk-first automation education artwork", caption: "Don’t ask: ‘Can a bot trade for me?’ Ask: ‘Can I explain the rules, risk settings, and failure points?’ If not, start with a demo." },
];

/**
 * Owner-requested private revision of the unapproved pilot. These are Gemini
 * Bot EA-only education and historical-evidence drafts. They do not claim
 * returns, make a 3S comparison, or change the manual posting model.
 */
export const GEMINI_BOT_THREADS_REVISION: MarketingDraftSeed[] = [
  { contentKey: "threads-pilot-01-automation-risk", title: "Gemini Bot EA is not a shortcut around risk", language: "en_ms", dayOffset: 1, caption: "Gemini Bot EA is designed to automate a configured MT5 workflow. It can execute a defined process consistently—but it cannot remove volatility, spread, slippage, or loss. Start on demo, define your own limits, and monitor the setup. Automation bukan jaminan keuntungan." },
  { contentKey: "threads-pilot-02-demo-checklist", title: "Before running Gemini Bot EA: four demo checks", language: "en", dayOffset: 2, assetUrl: "/manus-storage/fizuxcoder-setup-before-automation_c6fcf272.png", assetAlt: "Gemini Bot EA demo setup checklist graphic", caption: "Before attaching Gemini Bot EA to a live chart, check four things: your broker symbol, MT5 permissions, risk settings, and a demo test. A setup checklist may be less exciting than a profit screenshot—but it is far more useful." },
  { contentKey: "threads-pilot-03-product-workflows", title: "Gemini Bot EA August snapshot: inspect both sides", language: "en", dayOffset: 3, destinationUrl: "https://fizuxea-jxctlods.manus.space/#performance", caption: "Owner-supplied Gemini Bot EA XAUUSD snapshot: the owner states 13–25 August, while screenshots visibly show 24–25 August. The report shows +2,646.91 total, −1,216.78 gross loss, and 11.5% maximum drawdown. Not independently audited; not a forecast. Inspect the evidence before deciding." },
  { contentKey: "threads-pilot-04-delivery-workflow", title: "What happens after verified Gemini Bot EA payment", language: "en", dayOffset: 4, assetUrl: "/manus-storage/fizuxcoder-protected-delivery-workflow_054dfa57.png", assetAlt: "Gemini Bot EA verified receipt to installation guide workflow", caption: "After verified Gemini Bot EA payment: claim the receipt in the portal, bind the intended MT5 account, access the protected package, then follow the installation guide. Clear steps. No shared public download links." },
  { contentKey: "threads-pilot-05-risk-control", title: "Gemini Bot EA cannot remove operating risk", language: "en", dayOffset: 5, caption: "Gemini Bot EA executes configured rules. It cannot remove volatility, slippage, broker conditions, connectivity issues, or loss. A profitable outcome depends on market movement, execution, costs, and your setup. If you cannot explain your risk settings, do not automate live yet." },
  { contentKey: "threads-pilot-06-protected-delivery", title: "Gemini Bot EA delivery is account-bound", language: "en", dayOffset: 8, assetUrl: "/manus-storage/fizuxcoder-protected-delivery-workflow_054dfa57.png", assetAlt: "Gemini Bot EA protected delivery workflow graphic", caption: "Gemini Bot EA delivery is treated like software delivery: verified payment, account-bound access, documented versioning, and an installation guide. That is why the package is not distributed through an open public link." },
  { contentKey: "threads-pilot-07-separate-decisions", title: "Keep Gemini Bot EA and broker choices separate", language: "en", dayOffset: 9, caption: "A Gemini Bot EA purchase and a broker choice are separate decisions. Review product requirements, broker terms, risk disclosures, and suitability independently. A referral relationship does not make either choice right for everyone." },
  { contentKey: "threads-pilot-08-demo-first", title: "Demo Gemini Bot EA before live use", language: "en", dayOffset: 10, assetUrl: "/manus-storage/fizuxcoder-risk-first-video-cover_659d4e34.png", assetAlt: "Gemini Bot EA demo-first risk workflow cover", caption: "Demo Gemini Bot EA first. Verify the MT5 environment, attach only after setup review, then monitor the configured risk. Demo testing does not predict live results—but it helps you understand the workflow before taking live risk." },
  { contentKey: "threads-pilot-09-documentation", title: "Gemini Bot EA documentation should answer practical questions", language: "en", dayOffset: 11, caption: "Good Gemini Bot EA documentation answers practical questions: where files go, what account access is bound to, which MT5 permissions matter, and how monthly access is renewed. Clear operating information is more useful than exaggerated claims." },
  { contentKey: "threads-pilot-10-right-question", title: "Ask the right Gemini Bot EA question", language: "en", dayOffset: 12, assetUrl: "/manus-storage/fizuxcoder-risk-first-video-cover_659d4e34.png", assetAlt: "Gemini Bot EA risk-first automation education artwork", caption: "Don’t ask: ‘Can Gemini Bot EA make profit for me?’ Ask: ‘Can I explain the configured rules, risk settings, costs, and failure points?’ If not, begin with the demo workflow and read the risk notes." },
];

function contentHash(item: Pick<MarketingDraftSeed, "title" | "caption" | "language" | "assetUrl" | "assetAlt" | "destinationUrl">) {
  return createHash("sha256").update(JSON.stringify({ title: item.title, caption: item.caption, language: item.language, assetUrl: item.assetUrl ?? null, assetAlt: item.assetAlt ?? null, destinationUrl: item.destinationUrl ?? studioDestination, riskNotice: MARKETING_RISK_NOTICE })).digest("hex");
}

function pilotScheduledFor(dayOffset: number) {
  const scheduled = new Date();
  scheduled.setUTCDate(scheduled.getUTCDate() + dayOffset);
  scheduled.setUTCHours(1, 30, 0, 0); // 09:30 Malaysia time, recorded as UTC.
  return scheduled;
}

export async function listMarketingContent() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select().from(marketingContentItems).orderBy(asc(marketingContentItems.scheduledFor), asc(marketingContentItems.id));
}

export async function seedTwoWeekThreadsPilot(actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  let created = 0;
  let existing = 0;
  for (const draft of TWO_WEEK_THREADS_PILOT) {
    const existingRow = await db.select({ id: marketingContentItems.id }).from(marketingContentItems).where(eq(marketingContentItems.contentKey, draft.contentKey)).limit(1);
    if (existingRow.length) {
      existing += 1;
      continue;
    }
    const hash = contentHash(draft);
    const result = await db.insert(marketingContentItems).values({
      contentKey: draft.contentKey,
      title: draft.title,
      caption: draft.caption,
      language: draft.language,
      assetUrl: draft.assetUrl,
      assetAlt: draft.assetAlt,
      destinationUrl: draft.destinationUrl ?? studioDestination,
      riskNotice: MARKETING_RISK_NOTICE,
      scheduledFor: pilotScheduledFor(draft.dayOffset),
      status: "draft",
      complianceStatus: "passed",
      complianceFlags: JSON.stringify([]),
      contentHash: hash,
    });
    const contentItemId = Number(result[0].insertId);
    await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "seeded", contentHash: hash, note: "Two-week organic pilot draft" });
    created += 1;
  }
  return { created, existing };
}

export async function applyGeminiBotThreadsRevision(actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  let revised = 0;
  let current = 0;
  let skipped = 0;

  for (const draft of GEMINI_BOT_THREADS_REVISION) {
    const [existing] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.contentKey, draft.contentKey)).limit(1);
    if (!existing || existing.status !== "draft") {
      skipped += 1;
      continue;
    }
    const hash = contentHash(draft);
    if (existing.contentHash === hash) {
      current += 1;
      continue;
    }
    await db.update(marketingContentItems).set({
      title: draft.title,
      caption: draft.caption,
      language: draft.language,
      assetUrl: draft.assetUrl ?? null,
      assetAlt: draft.assetAlt ?? null,
      destinationUrl: draft.destinationUrl ?? studioDestination,
      riskNotice: MARKETING_RISK_NOTICE,
      scheduledFor: pilotScheduledFor(draft.dayOffset),
      status: "draft",
      complianceStatus: "passed",
      complianceFlags: JSON.stringify([]),
      contentHash: hash,
      approvedByUserId: null,
      approvedAt: null,
    }).where(and(eq(marketingContentItems.id, existing.id), eq(marketingContentItems.status, "draft")));
    await db.insert(marketingContentAudits).values({ contentItemId: existing.id, actorUserId, action: "revised", contentHash: hash, note: "Gemini Bot EA-only Threads revision" });
    revised += 1;
  }
  return { revised, current, skipped };
}

export async function approveMarketingContent({ contentItemId, actorUserId }: { contentItemId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, contentItemId)).limit(1);
  if (!item) throw new Error("Marketing draft not found");
  if (item.status !== "draft") throw new Error("Only a draft can be approved");
  if (item.complianceStatus !== "passed") throw new Error("Resolve compliance review before approving this draft");
  await db.update(marketingContentItems).set({ status: "approved", approvedByUserId: actorUserId, approvedAt: new Date() }).where(and(eq(marketingContentItems.id, contentItemId), eq(marketingContentItems.status, "draft")));
  await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "approved", contentHash: item.contentHash, note: "Manual Threads posting approved" });
  return { success: true };
}

export async function rejectMarketingContent({ contentItemId, actorUserId, note }: { contentItemId: number; actorUserId: number; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, contentItemId)).limit(1);
  if (!item) throw new Error("Marketing draft not found");
  if (item.status === "posted") throw new Error("A posted item cannot be rejected");
  await db.update(marketingContentItems).set({ status: "rejected", approvedByUserId: null, approvedAt: null }).where(eq(marketingContentItems.id, contentItemId));
  await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "rejected", contentHash: item.contentHash, note: note?.slice(0, 255) || "Owner rejected draft" });
  return { success: true };
}

export async function markMarketingContentPosted({ contentItemId, actorUserId, externalPostId }: { contentItemId: number; actorUserId: number; externalPostId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, contentItemId)).limit(1);
  if (!item) throw new Error("Marketing draft not found");
  if (item.status !== "approved") throw new Error("Only an approved draft may be marked as manually posted");
  await db.update(marketingContentItems).set({ status: "posted", postedByUserId: actorUserId, postedAt: new Date(), externalPostId: externalPostId?.trim().slice(0, 128) || null }).where(and(eq(marketingContentItems.id, contentItemId), eq(marketingContentItems.status, "approved")));
  await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "marked_posted", contentHash: item.contentHash, note: "Owner attested to manual Threads publication" });
  return { success: true };
}
