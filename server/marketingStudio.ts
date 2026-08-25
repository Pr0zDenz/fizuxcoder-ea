import { and, asc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { marketingContentAudits, marketingContentItems } from "../drizzle/schema";
import { getDb } from "./db";
import { publishThreadsPost, ThreadsPublishError } from "./threadsPublisher";
import { storagePut } from "./storage";

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
  { contentKey: "threads-gemini-day-01-process", title: "A trading process you can inspect", language: "en_ms", dayOffset: 1, caption: "Looking for a clearer MT5 workflow? Gemini Bot EA is built to execute configured rules—not to remove market risk. Review the settings, test on demo, and decide only after you understand the process. Automation bukan jaminan keuntungan. #GeminiBotEA #MT5 #AlgorithmicTrading #DemoFirst" },
  { contentKey: "threads-gemini-day-02-checklist", title: "Four checks before Gemini Bot EA", language: "en", dayOffset: 2, assetUrl: "/manus-storage/IMG_2829_afce1590.PNG", assetAlt: "Owner-supplied Gemini Bot EA risk metrics screenshot", caption: "Before live use, check the broker symbol, MT5 permissions, risk settings, and demo behavior. A disciplined setup is the opportunity: it lets you evaluate Gemini Bot EA before committing live capital. #GeminiBotEA #MT5 #TradingSystems #RiskManagement" },
  { contentKey: "threads-gemini-day-03-snapshot-a", title: "Read the result—and the drawdown", language: "en", dayOffset: 3, assetUrl: "/manus-storage/IMG_2830_370bd291.PNG", assetAlt: "Owner-supplied Gemini Bot EA profit and loss screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/#performance", caption: "Owner-supplied Gemini Bot EA XAUUSD snapshot: the owner describes 13–25 August, while this panel visibly shows 24–25 August 2026. It records +2,646.91 total, +3,863.69 gross profit, −1,216.78 gross loss. Historical only, not audited or forecast. #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { contentKey: "threads-gemini-day-04-trade-log-a", title: "The trade log is where claims meet reality", language: "en", dayOffset: 4, assetUrl: "/manus-storage/IMG_2828_34f3c4c6.PNG", assetAlt: "Owner-supplied Gemini Bot EA XAUUSD trade detail screenshot", caption: "A trade screenshot is not a promise. It is one record from one account at one time. Study entry, exit, size, timing, and conditions before forming an opinion about Gemini Bot EA. #GeminiBotEA #XAUUSD #MT5 #TradingJournal" },
  { contentKey: "threads-gemini-day-05-risk", title: "Profit potential and risk arrive together", language: "en", dayOffset: 5, assetUrl: "/manus-storage/IMG_2835_7c658f52.PNG", assetAlt: "Owner-supplied Gemini Bot EA risk report screenshot", caption: "The supplied report shows both winning and losing streaks: 23 consecutive wins, 9 consecutive losses, best trade 237.60, worst trade −125.64, and maximum drawdown of 11.5%. That is why Gemini Bot EA requires risk review—not blind confidence. #GeminiBotEA #RiskManagement #MT5 #XAUUSD" },
  { contentKey: "threads-gemini-day-06-setup", title: "Your first advantage is understanding the setup", language: "en", dayOffset: 6, caption: "The most important Gemini Bot EA setting is the one you understand. Confirm symbol, lot sizing, trading permissions, spread conditions, and a demo test before live use. Start informed; scale only according to your own tolerance. #GeminiBotEA #MT5 #ForexEducation #DemoTrading" },
  { contentKey: "threads-gemini-day-07-snapshot-b", title: "A second account view, clearly labelled", language: "en", dayOffset: 7, assetUrl: "/manus-storage/IMG_2840_e120a4fe.PNG", assetAlt: "Owner-supplied Gemini Bot EA second account summary screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/#performance", caption: "Separate owner-supplied Gemini Bot EA panel: this screenshot shows +1,520.43 total, +1,886.72 gross profit, −366.29 gross loss, and 2.66% maximum drawdown for the visible 25 August 2026 panel. It is not the same account as every screenshot. Historical, not a forecast. #GeminiBotEA #MT5 #TradingEvidence #XAUUSD" },
  { contentKey: "threads-gemini-day-08-activity", title: "Automation is visible in the activity", language: "en", dayOffset: 8, assetUrl: "/manus-storage/IMG_2833_571a13e3.PNG", assetAlt: "Owner-supplied Gemini Bot EA XAUUSD activity summary screenshot", caption: "The supplied panel shows 133 XAUUSD trades and 133 trading-robot entries for its visible report. Activity count is not a guarantee of quality or profit. Use it to ask better questions about sizing, frequency, costs, and drawdown. #GeminiBotEA #XAUUSD #MT5 #TradingData" },
  { contentKey: "threads-gemini-day-09-protected-delivery", title: "A serious product needs a serious delivery path", language: "en", dayOffset: 9, assetUrl: "/manus-storage/IMG_2837_78a02fa3.PNG", assetAlt: "Owner-supplied Gemini Bot EA trade detail screenshot", caption: "Interested in Gemini Bot EA? The customer path is structured: verified purchase, account-bound portal access, MT5 setup, and documented installation. The supplied trade view is evidence to inspect—not a promise to copy. #GeminiBotEA #MT5 #ExpertAdvisor #TradingWorkflow" },
  { contentKey: "threads-gemini-day-10-balance", title: "Look beyond the headline number", language: "en", dayOffset: 10, assetUrl: "/manus-storage/IMG_2834_8b1fe7a4.PNG", assetAlt: "Owner-supplied Gemini Bot EA balance and drawdown screenshot", caption: "A balance curve can attract attention; drawdown tells you what the journey can feel like. This supplied Gemini Bot EA panel shows a 1.87% drawdown view and a balance of 14,459.88. Account, period, and conditions matter. Historical only. #GeminiBotEA #RiskFirst #MT5 #TradingEvidence" },
  { contentKey: "threads-gemini-day-11-long-short", title: "Know how the system is trading", language: "en", dayOffset: 11, assetUrl: "/manus-storage/IMG_2832_9da9f941.PNG", assetAlt: "Owner-supplied Gemini Bot EA long and short activity screenshot", caption: "The supplied Gemini Bot EA report shows 117 long trades (87.97%) and 16 short trades (12.03%) in its visible panel. Directional distribution is context, not a signal to imitate. Review the rules and your own risk before live use. #GeminiBotEA #XAUUSD #MT5 #AlgorithmicTrading" },
  { contentKey: "threads-gemini-day-12-metrics", title: "Metrics make a better conversation", language: "en", dayOffset: 12, assetUrl: "/manus-storage/IMG_2829_afce1590.PNG", assetAlt: "Owner-supplied Gemini Bot EA performance metrics screenshot", caption: "The supplied report lists profit factor 3.18, recovery factor 3.87, max drawdown 11.5%, max deposit load 5.27%, 133 trades per week, and 35m average hold time. These are account observations, not expectations for your account. #GeminiBotEA #MT5 #RiskManagement #XAUUSD" },
  { contentKey: "threads-gemini-day-13-costs", title: "Costs belong in the decision", language: "en", dayOffset: 13, assetUrl: "/manus-storage/IMG_2831_3625126c.PNG", assetAlt: "Owner-supplied Gemini Bot EA profit and loss chart screenshot", caption: "Profit and loss should be read with spread, slippage, commissions, swaps, and broker conditions in mind. The supplied report shows +3,863.69 gross profit and −1,216.78 gross loss. Do not confuse gross figures with a personal outcome. #GeminiBotEA #MT5 #TradingCosts #RiskFirst" },
  { contentKey: "threads-gemini-day-14-evidence", title: "Evidence is stronger when limitations stay visible", language: "en", dayOffset: 14, assetUrl: "/manus-storage/IMG_2838_f14608ad.PNG", assetAlt: "Owner-supplied Gemini Bot EA trade history screenshot", caption: "The provided trade history shows real-looking activity, but screenshots do not prove future performance. Gemini Bot EA results can vary with account size, settings, broker execution, market regime, and timing. Review the evidence without overreading it. #GeminiBotEA #TradingEvidence #MT5 #XAUUSD" },
  { contentKey: "threads-gemini-day-15-demo", title: "The opportunity is to test before you risk", language: "en", dayOffset: 15, caption: "Want to evaluate Gemini Bot EA? Use the demo-first path: install carefully, confirm WebRequest and MT5 permissions, monitor behavior, and document what you observe. A demo cannot predict live results, but it can expose setup mistakes before they cost money. #GeminiBotEA #DemoFirst #MT5 #TradingEducation" },
  { contentKey: "threads-gemini-day-16-monthly", title: "Choose a workflow you can keep monitoring", language: "en", dayOffset: 16, caption: "Gemini Bot EA is a monthly-access product for MT5. Before subscribing, understand the installation, account binding, renewal, and monitoring responsibilities. The right customer is not chasing certainty; it is prepared to operate software responsibly. #GeminiBotEA #MT5 #ExpertAdvisor #RiskManagement" },
  { contentKey: "threads-gemini-day-17-questions", title: "Five questions before you decide", language: "en", dayOffset: 17, caption: "Before Gemini Bot EA, ask: What symbol will I trade? What lot size can I tolerate? What drawdown is unacceptable? How will I test? What happens if execution or connectivity changes? Good questions protect the opportunity to learn. #GeminiBotEA #MT5 #TradingQuestions #DemoTrading" },
  { contentKey: "threads-gemini-day-18-not-shortcut", title: "A bot is not a shortcut to certainty", language: "en", dayOffset: 18, caption: "Gemini Bot EA can automate configured execution. It cannot guarantee profit, remove market volatility, or make a broker decision for you. If you want to explore it, start with the rules, the risk note, and a demo—not a promise. #GeminiBotEA #AlgorithmicTrading #MT5 #RiskFirst" },
  { contentKey: "threads-gemini-day-19-get-started", title: "Ready to inspect Gemini Bot EA?", language: "en", dayOffset: 19, assetUrl: "/manus-storage/IMG_2841_74d86699.PNG", assetAlt: "Owner-supplied Gemini Bot EA second account risk screenshot", caption: "The supplied Gemini Bot EA panel shows a best trade of 108.00, worst trade −86.40, 29 consecutive wins, 7 consecutive losses, and maximum drawdown 2.66% for its visible report. Inspect the full context before deciding. #GeminiBotEA #MT5 #TradingEvidence #RiskManagement" },
  { contentKey: "threads-gemini-day-20-review", title: "Do the review, then make your own decision", language: "en", dayOffset: 20, caption: "Gemini Bot EA is for traders who want to study an MT5 automation workflow and take responsibility for its settings and risk. Review the supplied historical material, test on demo, and decide for yourself. Past account data does not guarantee future results. #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
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
  let created = 0;
  let revised = 0;
  let current = 0;
  let skipped = 0;
  let archived = 0;
  const desiredKeys = new Set(GEMINI_BOT_THREADS_REVISION.map(draft => draft.contentKey));

  for (const draft of GEMINI_BOT_THREADS_REVISION) {
    const [existing] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.contentKey, draft.contentKey)).limit(1);
    const hash = contentHash(draft);
    if (!existing) {
      const result = await db.insert(marketingContentItems).values({
        contentKey: draft.contentKey,
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
      });
      const contentItemId = Number(result[0].insertId);
      await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "revised", contentHash: hash, note: "Gemini Bot EA 20-day campaign created" });
      created += 1;
      continue;
    }
    if (existing.status !== "draft") {
      skipped += 1;
      continue;
    }
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
    await db.insert(marketingContentAudits).values({ contentItemId: existing.id, actorUserId, action: "revised", contentHash: hash, note: "Gemini Bot EA 20-day campaign revision" });
    revised += 1;
  }

  for (const legacyDraft of TWO_WEEK_THREADS_PILOT) {
    if (desiredKeys.has(legacyDraft.contentKey)) continue;
    const [legacy] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.contentKey, legacyDraft.contentKey)).limit(1);
    if (!legacy || legacy.status !== "draft") continue;
    await db.update(marketingContentItems).set({ status: "rejected", complianceFlags: JSON.stringify(["superseded_by_gemini_20_day_campaign"]) }).where(and(eq(marketingContentItems.id, legacy.id), eq(marketingContentItems.status, "draft")));
    await db.insert(marketingContentAudits).values({ contentItemId: legacy.id, actorUserId, action: "rejected", contentHash: legacy.contentHash, note: "Prior pilot draft superseded by Gemini Bot EA 20-day campaign" });
    archived += 1;
  }
  return { created, revised, current, skipped, archived };
}

export const GEMINI_EVENT_PORTAL_URL = "https://fizuxea-jxctlods.manus.space/portal";

export async function createGeminiVpsEventDraft({ eventId, eventType, screenshot, screenshotMimeType, occurredAt, accountLabel, symbol, profitAmount, actorUserId }: { eventId: string; eventType: "setup" | "take_profit"; screenshot: Buffer; screenshotMimeType: "image/png" | "image/jpeg" | "image/webp"; occurredAt?: string; accountLabel?: string; symbol?: string; profitAmount?: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const safeEventId = eventId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
  if (!safeEventId) throw new Error("eventId is required");
  const contentKey = `threads-gemini-vps-event-${safeEventId}`;
  const [existing] = await db.select({ id: marketingContentItems.id, status: marketingContentItems.status }).from(marketingContentItems).where(eq(marketingContentItems.contentKey, contentKey)).limit(1);
  if (existing) return { created: false, contentItemId: existing.id, status: existing.status };

  const stored = await storagePut(`threads/gemini-vps-events/${safeEventId}.png`, screenshot, screenshotMimeType);
  const eventLabel = eventType === "take_profit" ? "take-profit event" : "setup event";
  const occurredLabel = occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString();
  const accountContext = accountLabel ? ` Account label: ${accountLabel.slice(0, 40)}.` : "";
  const symbolContext = symbol ? ` Symbol: ${symbol.slice(0, 20)}.` : "";
  const profitContext = typeof profitAmount === "number" && Number.isFinite(profitAmount) ? ` Reported event amount: ${profitAmount.toFixed(2)}; verify the full account context before publication.` : "";
  const caption = `Gemini Bot EA ${eventLabel} captured at ${occurredLabel}.${accountContext}${symbolContext}${profitContext} This owner-supplied screenshot is one account event, not a promise or forecast. Review the full context, losses, drawdown, execution conditions, and demo-first guidance before deciding. Visit the portal: ${GEMINI_EVENT_PORTAL_URL} #GeminiBotEA #MT5 #TradingEvidence #RiskManagement`;
  const hash = contentHash({ title: `Gemini Bot EA — ${eventLabel}`, caption, language: "en", assetUrl: stored.url, assetAlt: `Owner-supplied Gemini Bot EA ${eventLabel} screenshot`, destinationUrl: GEMINI_EVENT_PORTAL_URL });
  const result = await db.insert(marketingContentItems).values({
    contentKey,
    title: `Gemini Bot EA — ${eventLabel}`,
    caption,
    language: "en",
    assetUrl: stored.url,
    assetAlt: `Owner-supplied Gemini Bot EA ${eventLabel} screenshot`,
    destinationUrl: GEMINI_EVENT_PORTAL_URL,
    riskNotice: MARKETING_RISK_NOTICE,
    scheduledFor: null,
    status: "draft",
    complianceStatus: "passed",
    complianceFlags: JSON.stringify(["evergreen_vps_event", "no_expiry", `event_type_${eventType}`]),
    contentHash: hash,
  });
  const contentItemId = Number(result[0].insertId);
  await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "revised", contentHash: hash, note: `Evergreen VPS ${eventLabel} screenshot draft created; approval required` });
  return { created: true, contentItemId, status: "draft" as const, assetUrl: stored.url };
}

export const EVERGREEN_GEMINI_COPY_BANK = [
  { title: "Inspect the process, not just the outcome", caption: "Interested in Gemini Bot EA? Start with the process: review the MT5 setup, understand the configured rules, test on demo, and monitor the account. A historical result can invite questions; it cannot promise your outcome. #GeminiBotEA #MT5 #TradingEducation #DemoFirst" },
  { title: "A clearer way to evaluate an EA", caption: "A serious EA evaluation asks practical questions: what does it trade, how is size set, how can drawdown appear, and what happens when conditions change? Gemini Bot EA is software to study and operate responsibly—not a guarantee of profit. #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { title: "Opportunity starts with preparation", caption: "The opportunity is not certainty. It is the chance to evaluate a defined MT5 workflow before risking live capital. Review Gemini Bot EA, test on demo, and decide only after the settings and risks make sense for you. #GeminiBotEA #MT5 #DemoTrading #TradingSystems" },
  { title: "Every account has its own conditions", caption: "Same EA, different account conditions. Results can vary with balance, settings, broker execution, spread, slippage, market regime, and timing. Treat Gemini Bot EA as a system to evaluate—not an income promise. #GeminiBotEA #XAUUSD #MT5 #RiskFirst" },
  { title: "Read the whole trading picture", caption: "Profit numbers attract attention. Losses, drawdown, costs, frequency, and execution complete the picture. If you are evaluating Gemini Bot EA, review the evidence carefully and test the setup before making a live decision. #GeminiBotEA #TradingEvidence #MT5 #RiskManagement" },
  { title: "Automation should make decisions clearer", caption: "Automation does not remove responsibility. Gemini Bot EA can execute configured rules on MT5, while you remain responsible for setup, monitoring, broker choice, and risk. Learn the workflow before you decide whether it fits. #GeminiBotEA #MT5 #AlgorithmicTrading #TradingEducation" },
  { title: "Do not skip the demo phase", caption: "Before live use, verify symbol settings, permissions, sizing, spread conditions, and expected behavior on demo. Gemini Bot EA deserves a review based on your own tolerance—not a rushed decision based on one screenshot. #GeminiBotEA #DemoFirst #MT5 #RiskManagement" },
  { title: "The right questions beat the loudest claim", caption: "Ask better questions before choosing an EA: What is the process? What can fail? What drawdown can I tolerate? How will I monitor it? Gemini Bot EA is for evaluation and responsible operation, not guaranteed returns. #GeminiBotEA #MT5 #TradingQuestions #RiskFirst" },
  { title: "Study the journey, not only the finish", caption: "A profitable line on a chart is only one part of a trading record. Study the path, losing periods, drawdown, costs, and conditions. Historical Gemini Bot EA material is context—not a forecast. #GeminiBotEA #TradingJournal #MT5 #TradingEvidence" },
  { title: "Build your own view of the system", caption: "Do not outsource your judgement to a bot or a screenshot. Review Gemini Bot EA documentation, understand the MT5 workflow, test on demo, and form your own view before using live funds. #GeminiBotEA #MT5 #DemoTrading #TradingEducation" },
  { title: "Configured execution still meets a changing market", caption: "Market conditions change. Slippage, spreads, connectivity, and volatility can change the experience of any automated strategy. Gemini Bot EA is not risk-free; review the controls and monitor your own account. #GeminiBotEA #MT5 #RiskManagement #XAUUSD" },
  { title: "A system is easier to judge when the limits are visible", caption: "Good evaluation includes limits: maximum drawdown, losing streaks, exposure, costs, and what you will do if conditions change. Gemini Bot EA historical material should be read with those limits visible. #GeminiBotEA #TradingEvidence #MT5 #RiskFirst" },
  { title: "Use evidence to investigate, not imitate", caption: "An owner-supplied account screenshot can help you investigate a system. It cannot tell you what your account will earn. Examine Gemini Bot EA evidence, settings, timing, and risk before deciding what to do next. #GeminiBotEA #XAUUSD #MT5 #TradingJournal" },
  { title: "MT5 automation needs an operating plan", caption: "Before installing Gemini Bot EA, decide how you will configure, monitor, pause, and review it. The software is only one part of the operating plan; your risk limits and attention still matter. #GeminiBotEA #MT5 #ExpertAdvisor #RiskManagement" },
  { title: "The best first step is a measured one", caption: "Curious about Gemini Bot EA? Take a measured first step: read the guide, confirm your MT5 environment, use demo testing, and record what you observe. Past results do not guarantee future results. #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { title: "Performance has a context", caption: "Gross profit, gross loss, profit factor, and drawdown each answer a different question. Review them together before forming an opinion about Gemini Bot EA. No single metric can predict your personal result. #GeminiBotEA #TradingEvidence #MT5 #RiskManagement" },
  { title: "Responsible automation is an active decision", caption: "Choosing automation is not switching off. It means understanding the rules, checking the environment, monitoring execution, and accepting that losses are possible. Evaluate Gemini Bot EA on that basis. #GeminiBotEA #MT5 #AlgorithmicTrading #RiskFirst" },
  { title: "What happens after you decide matters", caption: "A responsible Gemini Bot EA workflow includes protected delivery, documented installation, account setup, demo testing, and ongoing review. Clear steps do not remove market risk—but they reduce avoidable setup confusion. #GeminiBotEA #MT5 #TradingWorkflow #DemoFirst" },
  { title: "Attention is useful when it leads to better questions", caption: "A strong result can catch your eye. Let the next step be a stronger question: what conditions produced it, what losses occurred, and how would I respond? Review Gemini Bot EA without assuming repetition. #GeminiBotEA #XAUUSD #MT5 #TradingEvidence" },
  { title: "Decide with information, not urgency", caption: "If you are considering Gemini Bot EA, take time to understand the product, test the setup, and decide whether the risk fits your circumstances. There is no promise that an EA will earn profit for you. #GeminiBotEA #MT5 #RiskManagement #DemoFirst" },
] as const;

export async function createEvergreenGeminiDraftAfterPublish({ item, actorUserId }: { item: typeof marketingContentItems.$inferSelect; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const copy = EVERGREEN_GEMINI_COPY_BANK[(item.id + item.contentHash.charCodeAt(0)) % EVERGREEN_GEMINI_COPY_BANK.length];
  const contentKey = `threads-gemini-evergreen-${item.id}-${item.contentHash.slice(0, 12)}`;
  const [existing] = await db.select({ id: marketingContentItems.id, status: marketingContentItems.status }).from(marketingContentItems).where(eq(marketingContentItems.contentKey, contentKey)).limit(1);
  if (existing) return { created: false, contentItemId: existing.id };
  const draft = {
    contentKey,
    title: copy.title,
    caption: copy.caption,
    language: "en" as const,
    assetUrl: item.assetUrl ?? undefined,
    assetAlt: item.assetAlt ?? undefined,
    destinationUrl: item.destinationUrl,
    dayOffset: 1,
  };
  const hash = contentHash(draft);
  const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const result = await db.insert(marketingContentItems).values({
    contentKey: draft.contentKey,
    title: draft.title,
    caption: draft.caption,
    language: draft.language,
    assetUrl: draft.assetUrl,
    assetAlt: draft.assetAlt,
    destinationUrl: draft.destinationUrl,
    riskNotice: MARKETING_RISK_NOTICE,
    scheduledFor,
    status: "draft",
    complianceStatus: "passed",
    complianceFlags: JSON.stringify(["evergreen_replenishment", `after_post_${item.id}`]),
    contentHash: hash,
  });
  const contentItemId = Number(result[0].insertId);
  await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "revised", contentHash: hash, note: `Fresh Gemini Bot EA copy replenished after post #${item.id}`.slice(0, 255) });
  return { created: true, contentItemId };
}

async function publishApprovedMarketingContent({ contentItemId, actorUserId, retry }: { contentItemId: number; actorUserId: number; retry: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, contentItemId)).limit(1);
  if (!item) throw new Error("Marketing draft not found");
  if (item.complianceStatus !== "passed") throw new Error("Resolve compliance review before publishing this draft");
  if (retry ? item.status !== "publish_failed" : item.status !== "draft") throw new Error(retry ? "Only a failed automatic publication can be retried" : "Only a draft can be approved and published");
  const attemptKey = createHash("sha256").update(`${item.id}:${item.contentHash}`).digest("hex");
  const now = new Date();
  const transition = await db.update(marketingContentItems).set({ status: "publish_pending", approvedByUserId: actorUserId, approvedAt: now, publishAttemptKey: attemptKey, publishAttemptedAt: now, publishErrorCode: null, publishErrorMessage: null }).where(and(eq(marketingContentItems.id, item.id), retry ? eq(marketingContentItems.status, "publish_failed") : eq(marketingContentItems.status, "draft")));
  if (!transition[0].affectedRows) throw new Error("This draft is already being processed or has changed");
  await db.insert(marketingContentAudits).values({ contentItemId: item.id, actorUserId, action: retry ? "publish_started" : "approved", contentHash: item.contentHash, note: retry ? "Automatic Threads publication retry started" : "Approval triggered automatic Threads publication" });
  const text = `${item.caption}\n\n${item.riskNotice}`;
  try {
    const published = await publishThreadsPost({ ownerUserId: actorUserId, text, assetUrl: item.assetUrl });
    await db.update(marketingContentItems).set({ status: "posted", postedByUserId: actorUserId, postedAt: new Date(), externalPostId: published.externalPostId, publishErrorCode: null, publishErrorMessage: null }).where(and(eq(marketingContentItems.id, item.id), eq(marketingContentItems.status, "publish_pending"), eq(marketingContentItems.publishAttemptKey, attemptKey)));
    await db.insert(marketingContentAudits).values({ contentItemId: item.id, actorUserId, action: "published", contentHash: item.contentHash, note: published.hasImage ? "Automatic Threads publication succeeded with one image" : "Automatic Threads publication succeeded as text-only" });
    let replenishment: { created: boolean; contentItemId?: number } = { created: false };
    try {
      replenishment = await createEvergreenGeminiDraftAfterPublish({ item, actorUserId });
    } catch (replenishmentError) {
      console.error("[Threads] Published post but evergreen replenishment failed", replenishmentError);
    }
    return { success: true, externalPostId: published.externalPostId, hasImage: published.hasImage, replenishment };

  } catch (error) {
    const code = error instanceof ThreadsPublishError ? error.code : "PUBLISH_ERROR";
    const message = error instanceof Error ? error.message : "Threads publication failed";
    await db.update(marketingContentItems).set({ status: "publish_failed", publishErrorCode: code.slice(0, 64), publishErrorMessage: message.slice(0, 255) }).where(and(eq(marketingContentItems.id, item.id), eq(marketingContentItems.status, "publish_pending"), eq(marketingContentItems.publishAttemptKey, attemptKey)));
    await db.insert(marketingContentAudits).values({ contentItemId: item.id, actorUserId, action: "publish_failed", contentHash: item.contentHash, note: `${code}: ${message}`.slice(0, 255) });
    throw new Error(`Automatic Threads publication failed (${code}). ${message}`);
  }
}

export function approveMarketingContent({ contentItemId, actorUserId }: { contentItemId: number; actorUserId: number }) {
  return publishApprovedMarketingContent({ contentItemId, actorUserId, retry: false });
}

export function retryMarketingContentPublication({ contentItemId, actorUserId }: { contentItemId: number; actorUserId: number }) {
  return publishApprovedMarketingContent({ contentItemId, actorUserId, retry: true });
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
  if (item.status !== "approved") throw new Error("Manual posting is available only for legacy approved records");
  await db.update(marketingContentItems).set({ status: "posted", postedByUserId: actorUserId, postedAt: new Date(), externalPostId: externalPostId?.trim().slice(0, 128) || null }).where(and(eq(marketingContentItems.id, contentItemId), eq(marketingContentItems.status, "approved")));
  await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "marked_posted", contentHash: item.contentHash, note: "Owner attested to manual Threads publication" });
  return { success: true };
}
