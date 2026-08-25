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
  { contentKey: "threads-gemini-day-01-process", title: "A clearer way to explore MT5 automation", language: "en_ms", dayOffset: 1, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Curious about Gemini Bot EA? Start with a defined MT5 workflow: understand the rules, test on demo, and monitor the account. Berminat mencuba? Mulakan dengan faham proses, uji pada akaun demo, dan pantau sendiri. No EA can guarantee profit. Visit the portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { contentKey: "threads-gemini-day-02-checklist", title: "Four checks before you attach an EA", language: "en_ms", dayOffset: 2, assetUrl: "/manus-storage/IMG_2829_afce1590.PNG", assetAlt: "Owner-supplied Gemini Bot EA risk metrics screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Before attaching Gemini Bot EA, check symbol, permissions, sizing, and spread conditions. Sebelum pasang Gemini Bot EA, semak simbol, kebenaran MT5, saiz lot, dan spread. A careful setup is your first advantage—not a promise of returns. Explore the portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { contentKey: "threads-gemini-day-03-snapshot-a", title: "The opportunity is a better process", language: "en_ms", dayOffset: 3, assetUrl: "/manus-storage/IMG_2830_370bd291.PNG", assetAlt: "Owner-supplied Gemini Bot EA profit and loss screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "The opportunity is to evaluate a repeatable process before risking live funds. Peluang sebenar ialah menilai proses yang jelas sebelum menggunakan dana sebenar. Review Gemini Bot EA, test on demo, and decide at your own pace: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { contentKey: "threads-gemini-day-04-trade-log-a", title: "One screenshot is not your forecast", language: "en_ms", dayOffset: 4, assetUrl: "/manus-storage/IMG_2828_34f3c4c6.PNG", assetAlt: "Owner-supplied Gemini Bot EA XAUUSD trade detail screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "A trading screenshot can start a conversation, but it cannot predict your account. Satu screenshot dagangan boleh membuka perbincangan, tetapi bukan ramalan akaun anda. Review context, losses, drawdown, and execution before deciding: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { contentKey: "threads-gemini-day-05-risk", title: "Why risk review matters", language: "en_ms", dayOffset: 5, assetUrl: "/manus-storage/IMG_2835_7c658f52.PNG", assetAlt: "Owner-supplied Gemini Bot EA risk report screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Profit and loss arrive together in trading. Keuntungan dan kerugian sentiasa datang bersama dalam dagangan. Gemini Bot EA is software for configured MT5 execution, not a shortcut around volatility, slippage, or broker conditions. Learn more: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { contentKey: "threads-gemini-day-06-setup", title: "See the workflow before the headline", language: "en_ms", dayOffset: 6, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Want to know what Gemini Bot EA actually involves? Review installation, account binding, settings, demo testing, and monitoring. Mahu tahu aliran sebenar? Semak pemasangan, binding akaun, tetapan, ujian demo, dan pemantauan. Start here: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { contentKey: "threads-gemini-day-07-snapshot-b", title: "Different accounts, different outcomes", language: "en_ms", dayOffset: 7, assetUrl: "/manus-storage/IMG_2840_e120a4fe.PNG", assetAlt: "Owner-supplied Gemini Bot EA second account summary screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "The same EA can behave differently across accounts because settings, balance, broker execution, spread, and market regime differ. Akaun yang berbeza boleh menghasilkan pengalaman berbeza. Evaluate Gemini Bot EA for your own situation: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { contentKey: "threads-gemini-day-08-activity", title: "Turn curiosity into a measured test", language: "en_ms", dayOffset: 8, assetUrl: "/manus-storage/IMG_2833_571a13e3.PNG", assetAlt: "Owner-supplied Gemini Bot EA XAUUSD activity summary screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Curious traders do not need to rush. Pedagang yang ingin tahu tidak perlu terburu-buru. Read the guide, attach Gemini Bot EA to demo, record what you observe, and only then consider your next step: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { contentKey: "threads-gemini-day-09-protected-delivery", title: "What should you ask before subscribing?", language: "en_ms", dayOffset: 9, assetUrl: "/manus-storage/IMG_2837_78a02fa3.PNG", assetAlt: "Owner-supplied Gemini Bot EA trade detail screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Ask: What can I lose? How will I monitor it? What happens when conditions change? Tanya: Berapa risiko yang mampu saya tanggung? Bagaimana saya akan memantau? Apa berlaku apabila pasaran berubah? Explore Gemini Bot EA: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { contentKey: "threads-gemini-day-10-balance", title: "A bot does not replace your judgement", language: "en_ms", dayOffset: 10, assetUrl: "/manus-storage/IMG_2834_8b1fe7a4.PNG", assetAlt: "Owner-supplied Gemini Bot EA balance and drawdown screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Gemini Bot EA can execute configured rules, but you remain responsible for settings, monitoring, and risk. Gemini Bot EA boleh melaksanakan peraturan yang ditetapkan, tetapi anda tetap bertanggungjawab terhadap tetapan dan risiko. Learn before you automate: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { contentKey: "threads-gemini-day-11-long-short", title: "Read drawdown with the result", language: "en_ms", dayOffset: 11, assetUrl: "/manus-storage/IMG_2832_9da9f941.PNG", assetAlt: "Owner-supplied Gemini Bot EA long and short activity screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "A result means more when you also review drawdown, losing streaks, costs, and exposure. Keputusan lebih bermakna apabila drawdown, siri kerugian, kos, dan pendedahan turut dilihat. Historical material is context, not a forecast: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { contentKey: "threads-gemini-day-12-metrics", title: "Demo first is a serious strategy", language: "en_ms", dayOffset: 12, assetUrl: "/manus-storage/IMG_2829_afce1590.PNG", assetAlt: "Owner-supplied Gemini Bot EA performance metrics screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Demo testing is not hesitation—it is preparation. Ujian demo bukan tanda takut—ia persediaan. Verify the MT5 environment, observe Gemini Bot EA, and decide whether the workflow fits your tolerance: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { contentKey: "threads-gemini-day-13-costs", title: "Evidence should create questions", language: "en_ms", dayOffset: 13, assetUrl: "/manus-storage/IMG_2831_3625126c.PNG", assetAlt: "Owner-supplied Gemini Bot EA profit and loss chart screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "An owner-supplied result can invite useful questions about timing, sizing, and conditions. Bukti yang dibekalkan pemilik boleh membuka soalan tentang masa, saiz lot, dan keadaan pasaran. It does not promise your outcome. Review: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { contentKey: "threads-gemini-day-14-evidence", title: "Costs belong in every EA decision", language: "en_ms", dayOffset: 14, assetUrl: "/manus-storage/IMG_2838_f14608ad.PNG", assetAlt: "Owner-supplied Gemini Bot EA trade history screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Spread, slippage, commission, swaps, and execution can affect results. Spread, slippage, komisen, swap, dan pelaksanaan boleh mempengaruhi keputusan. Include those costs when evaluating Gemini Bot EA, not just the attractive number: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { contentKey: "threads-gemini-day-15-demo", title: "Build an operating plan", language: "en_ms", dayOffset: 15, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Before using Gemini Bot EA, decide how you will configure, monitor, pause, and review it. Sebelum menggunakan Gemini Bot EA, tetapkan cara anda mengkonfigurasi, memantau, menghentikan, dan menilai sistem. A plan makes automation more responsible: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { contentKey: "threads-gemini-day-16-monthly", title: "The market can change after a good period", language: "en_ms", dayOffset: 16, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "A strong period does not remove future uncertainty. Tempoh yang baik tidak menghapuskan ketidakpastian masa depan. Gemini Bot EA should be evaluated across settings, execution conditions, and your own risk limits: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { contentKey: "threads-gemini-day-17-questions", title: "Protected delivery, clearer setup", language: "en_ms", dayOffset: 17, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "A responsible customer journey includes verified access, account binding, installation guidance, and demo testing. Aliran pelanggan yang bertanggungjawab merangkumi akses disahkan, binding akaun, panduan pemasangan, dan ujian demo. Inspect the Gemini Bot EA workflow: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { contentKey: "threads-gemini-day-18-not-shortcut", title: "Do not confuse activity with certainty", language: "en_ms", dayOffset: 18, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "More trades do not automatically mean better results. Lebih banyak trade tidak semestinya bermaksud keputusan lebih baik. Review frequency, size, drawdown, and costs before forming an opinion about Gemini Bot EA: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { contentKey: "threads-gemini-day-19-get-started", title: "Ready to investigate Gemini Bot EA?", language: "en_ms", dayOffset: 19, assetUrl: "/manus-storage/IMG_2841_74d86699.PNG", assetAlt: "Owner-supplied Gemini Bot EA second account risk screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "If you want to explore MT5 automation, begin with information: read the risk note, review the workflow, and test on demo. Jika mahu meneroka automasi MT5, mulakan dengan maklumat dan ujian demo. Past performance does not guarantee future results: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { contentKey: "threads-gemini-day-20-review", title: "A decision you can explain is a better decision", language: "en_ms", dayOffset: 20, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Choose only a workflow you can explain and monitor. Pilih hanya proses yang anda faham dan mampu pantau. Gemini Bot EA is an evaluation opportunity, not guaranteed income. Review the full portal before deciding: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
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
  const caption = `Gemini Bot EA ${eventLabel} captured at ${occurredLabel}.${accountContext}${symbolContext}${profitContext} Owner-supplied event evidence only, not a promise or forecast. Semak konteks penuh, kerugian, drawdown, kos, dan keadaan pelaksanaan sebelum membuat keputusan. Visit the portal / Lihat portal: ${GEMINI_EVENT_PORTAL_URL} #GeminiBotEA #MT5 #TradingEvidence #RiskManagement`;
  const hash = contentHash({ title: `Gemini Bot EA — ${eventLabel}`, caption, language: "en_ms", assetUrl: stored.url, assetAlt: `Owner-supplied Gemini Bot EA ${eventLabel} screenshot`, destinationUrl: GEMINI_EVENT_PORTAL_URL });
  const result = await db.insert(marketingContentItems).values({
    contentKey,
    title: `Gemini Bot EA — ${eventLabel}`,
    caption,
    language: "en_ms",
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
  { title: "A clearer way to explore MT5 automation", caption: "Curious about Gemini Bot EA? Start with a defined MT5 workflow: understand the rules, test on demo, and monitor the account. Berminat mencuba? Mulakan dengan faham proses, uji pada akaun demo, dan pantau sendiri. No EA can guarantee profit. Visit the portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { title: "Four checks before you attach an EA", caption: "Before attaching Gemini Bot EA, check symbol, permissions, sizing, and spread conditions. Sebelum pasang Gemini Bot EA, semak simbol, kebenaran MT5, saiz lot, dan spread. A careful setup is your first advantage—not a promise of returns. Explore the portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { title: "The opportunity is a better process", caption: "The opportunity is to evaluate a repeatable process before risking live funds. Peluang sebenar ialah menilai proses yang jelas sebelum menggunakan dana sebenar. Review Gemini Bot EA, test on demo, and decide at your own pace: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { title: "One screenshot is not your forecast", caption: "A trading screenshot can start a conversation, but it cannot predict your account. Satu screenshot dagangan boleh membuka perbincangan, tetapi bukan ramalan akaun anda. Review context, losses, drawdown, and execution before deciding: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { title: "Why risk review matters", caption: "Profit and loss arrive together in trading. Keuntungan dan kerugian sentiasa datang bersama dalam dagangan. Gemini Bot EA is software for configured MT5 execution, not a shortcut around volatility, slippage, or broker conditions. Learn more: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { title: "See the workflow before the headline", caption: "Want to know what Gemini Bot EA actually involves? Review installation, account binding, settings, demo testing, and monitoring. Mahu tahu aliran sebenar? Semak pemasangan, binding akaun, tetapan, ujian demo, dan pemantauan. Start here: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { title: "Different accounts, different outcomes", caption: "The same EA can behave differently across accounts because settings, balance, broker execution, spread, and market regime differ. Akaun yang berbeza boleh menghasilkan pengalaman berbeza. Evaluate Gemini Bot EA for your own situation: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { title: "Turn curiosity into a measured test", caption: "Curious traders do not need to rush. Pedagang yang ingin tahu tidak perlu terburu-buru. Read the guide, attach Gemini Bot EA to demo, record what you observe, and only then consider your next step: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { title: "What should you ask before subscribing?", caption: "Ask: What can I lose? How will I monitor it? What happens when conditions change? Tanya: Berapa risiko yang mampu saya tanggung? Bagaimana saya akan memantau? Apa berlaku apabila pasaran berubah? Explore Gemini Bot EA: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { title: "A bot does not replace your judgement", caption: "Gemini Bot EA can execute configured rules, but you remain responsible for settings, monitoring, and risk. Gemini Bot EA boleh melaksanakan peraturan yang ditetapkan, tetapi anda tetap bertanggungjawab terhadap tetapan dan risiko. Learn before you automate: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { title: "Read drawdown with the result", caption: "A result means more when you also review drawdown, losing streaks, costs, and exposure. Keputusan lebih bermakna apabila drawdown, siri kerugian, kos, dan pendedahan turut dilihat. Historical material is context, not a forecast: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { title: "Demo first is a serious strategy", caption: "Demo testing is not hesitation—it is preparation. Ujian demo bukan tanda takut—ia persediaan. Verify the MT5 environment, observe Gemini Bot EA, and decide whether the workflow fits your tolerance: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { title: "Evidence should create questions", caption: "An owner-supplied result can invite useful questions about timing, sizing, and conditions. Bukti yang dibekalkan pemilik boleh membuka soalan tentang masa, saiz lot, dan keadaan pasaran. It does not promise your outcome. Review: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { title: "Costs belong in every EA decision", caption: "Spread, slippage, commission, swaps, and execution can affect results. Spread, slippage, komisen, swap, dan pelaksanaan boleh mempengaruhi keputusan. Include those costs when evaluating Gemini Bot EA, not just the attractive number: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { title: "Build an operating plan", caption: "Before using Gemini Bot EA, decide how you will configure, monitor, pause, and review it. Sebelum menggunakan Gemini Bot EA, tetapkan cara anda mengkonfigurasi, memantau, menghentikan, dan menilai sistem. A plan makes automation more responsible: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { title: "The market can change after a good period", caption: "A strong period does not remove future uncertainty. Tempoh yang baik tidak menghapuskan ketidakpastian masa depan. Gemini Bot EA should be evaluated across settings, execution conditions, and your own risk limits: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
  { title: "Protected delivery, clearer setup", caption: "A responsible customer journey includes verified access, account binding, installation guidance, and demo testing. Aliran pelanggan yang bertanggungjawab merangkumi akses disahkan, binding akaun, panduan pemasangan, dan ujian demo. Inspect the Gemini Bot EA workflow: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingEducation" },
  { title: "Do not confuse activity with certainty", caption: "More trades do not automatically mean better results. Lebih banyak trade tidak semestinya bermaksud keputusan lebih baik. Review frequency, size, drawdown, and costs before forming an opinion about Gemini Bot EA: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading" },
  { title: "Ready to investigate Gemini Bot EA?", caption: "If you want to explore MT5 automation, begin with information: read the risk note, review the workflow, and test on demo. Jika mahu meneroka automasi MT5, mulakan dengan maklumat dan ujian demo. Past performance does not guarantee future results: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #TradingEvidence #MT5" },
  { title: "A decision you can explain is a better decision", caption: "Choose only a workflow you can explain and monitor. Pilih hanya proses yang anda faham dan mampu pantau. Gemini Bot EA is an evaluation opportunity, not guaranteed income. Review the full portal before deciding: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystems #RiskFirst" },
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
    language: "en_ms" as const,
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
