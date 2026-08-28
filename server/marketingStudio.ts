import { and, asc, eq, like } from "drizzle-orm";
import { createHash } from "node:crypto";
import { marketingContentAudits, marketingContentItems } from "../drizzle/schema";
import { getDb } from "./db";
import { buildThreadsPublicationText, publishThreadsPost, ThreadsPublishError } from "./threadsPublisher";
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
  { contentKey: "threads-gemini-day-01-process", title: "Nak automate MT5 dengan lebih teratur?", language: "en_ms", dayOffset: 1, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Nak explore Gemini Bot EA? This is your chance to study a structured MT5 workflow—rules, setup, demo test, then monitor. Bukan magic button, tapi serious tool for traders yang mahu lebih systematic. Profit is never promised. Check portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { contentKey: "threads-gemini-day-02-checklist", title: "Jangan terus attach—buat 4 checks dulu", language: "en_ms", dayOffset: 2, assetUrl: "/manus-storage/IMG_2829_afce1590.PNG", assetAlt: "Owner-supplied Gemini Bot EA risk metrics screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Before attach Gemini Bot EA, check symbol, MT5 permission, lot sizing and spread. Simple checks, big difference untuk elak setup mistake. Start smart, test on demo dulu, then decide. Tengok full workflow: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { contentKey: "threads-gemini-day-03-snapshot-a", title: "Opportunity ada, tapi kena faham process", language: "en_ms", dayOffset: 3, assetUrl: "/manus-storage/IMG_2830_370bd291.PNG", assetAlt: "Owner-supplied Gemini Bot EA profit and loss screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Kalau anda curious dengan Gemini Bot EA, jangan ikut screenshot semata-mata. Study the process, test on demo, dan tengok sama ada workflow ini sesuai dengan risk tolerance anda. Explore sekarang: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { contentKey: "threads-gemini-day-04-trade-log-a", title: "Screenshot nampak menarik, tapi context lagi penting", language: "en_ms", dayOffset: 4, assetUrl: "/manus-storage/IMG_2828_34f3c4c6.PNG", assetAlt: "Owner-supplied Gemini Bot EA XAUUSD trade detail screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "One trade screenshot can catch attention—but it is not your forecast. Tengok entry, exit, size, timing, drawdown and market condition sebelum buat keputusan. Evidence untuk study, bukan promise. Review portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { contentKey: "threads-gemini-day-05-risk", title: "Profit dan loss memang datang satu package", language: "en_ms", dayOffset: 5, assetUrl: "/manus-storage/IMG_2835_7c658f52.PNG", assetAlt: "Owner-supplied Gemini Bot EA risk report screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Dalam trading, winning period dan losing period boleh berlaku bersama. Gemini Bot EA helps execute configured MT5 rules, but volatility, slippage and broker conditions tetap wujud. Faham risk dulu: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { contentKey: "threads-gemini-day-06-setup", title: "Kalau nak cuba EA, mula dengan setup yang betul", language: "en_ms", dayOffset: 6, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Interested nak try Gemini Bot EA? Review installation, account binding, settings, demo testing and monitoring. Bila process clear, lebih senang anda decide dengan kepala sendiri. Start your review here: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { contentKey: "threads-gemini-day-07-snapshot-b", title: "Same EA, different account—jangan compare membuta", language: "en_ms", dayOffset: 7, assetUrl: "/manus-storage/IMG_2840_e120a4fe.PNG", assetAlt: "Owner-supplied Gemini Bot EA second account summary screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Results boleh berbeza ikut balance, settings, broker execution, spread dan market regime. Sebab itu Gemini Bot EA perlu diuji ikut keadaan akaun anda sendiri, bukan copy result orang. Explore dengan lebih bijak: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { contentKey: "threads-gemini-day-08-activity", title: "Curious? Turn it into a proper demo test", language: "en_ms", dayOffset: 8, assetUrl: "/manus-storage/IMG_2833_571a13e3.PNG", assetAlt: "Owner-supplied Gemini Bot EA XAUUSD activity summary screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Tak perlu rush. Read the guide, attach Gemini Bot EA on demo, monitor behavior and record what you see. Itu cara paling practical untuk tahu workflow ini fit atau tidak dengan cara trading anda: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { contentKey: "threads-gemini-day-09-protected-delivery", title: "Sebelum subscribe, tanya soalan yang betul", language: "en_ms", dayOffset: 9, assetUrl: "/manus-storage/IMG_2837_78a02fa3.PNG", assetAlt: "Owner-supplied Gemini Bot EA trade detail screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "What can I lose? How will I monitor? What if market conditions change? Soalan simple, tapi penting. Gemini Bot EA is for traders who mahu study automation—not chase certainty. Read before deciding: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { contentKey: "threads-gemini-day-10-balance", title: "Bot boleh execute, tapi judgement tetap milik anda", language: "en_ms", dayOffset: 10, assetUrl: "/manus-storage/IMG_2834_8b1fe7a4.PNG", assetAlt: "Owner-supplied Gemini Bot EA balance and drawdown screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Gemini Bot EA can follow configured rules on MT5, tetapi anda masih control the setup, monitoring, broker choice and risk. Automation bukan alasan untuk switch off your judgement. Learn more: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { contentKey: "threads-gemini-day-11-long-short", title: "Jangan tengok result sahaja—tengok drawdown juga", language: "en_ms", dayOffset: 11, assetUrl: "/manus-storage/IMG_2832_9da9f941.PNG", assetAlt: "Owner-supplied Gemini Bot EA long and short activity screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "A better review looks at profit, loss, drawdown, losing streaks, costs and exposure together. Itu yang bantu anda nampak full picture, bukan hanya headline number. Historical evidence is not a forecast: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { contentKey: "threads-gemini-day-12-metrics", title: "Demo first bukan lambat—itu preparation", language: "en_ms", dayOffset: 12, assetUrl: "/manus-storage/IMG_2829_afce1590.PNG", assetAlt: "Owner-supplied Gemini Bot EA performance metrics screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Before live funds, verify symbol, permission, lot size and expected behavior on demo. Gemini Bot EA deserves a measured test, bukan keputusan terburu-buru sebab nampak one good screenshot: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { contentKey: "threads-gemini-day-13-costs", title: "Bukti yang bagus buat kita tanya soalan lebih baik", language: "en_ms", dayOffset: 13, assetUrl: "/manus-storage/IMG_2831_3625126c.PNG", assetAlt: "Owner-supplied Gemini Bot EA profit and loss chart screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Owner-supplied performance evidence boleh bantu anda investigate timing, sizing and conditions. Tapi jangan anggap result itu akan repeat pada account anda. Study the details here: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { contentKey: "threads-gemini-day-14-evidence", title: "Jangan lupa trading costs dalam kira-kira", language: "en_ms", dayOffset: 14, assetUrl: "/manus-storage/IMG_2838_f14608ad.PNG", assetAlt: "Owner-supplied Gemini Bot EA trade history screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Spread, slippage, commission, swap and execution boleh affect your result. Kalau nak evaluate Gemini Bot EA, kira semua costs—not just the attractive gross number. Make an informed decision: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { contentKey: "threads-gemini-day-15-demo", title: "Automation yang serius perlukan operating plan", language: "en_ms", dayOffset: 15, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Sebelum guna Gemini Bot EA, decide how you will configure, monitor, pause and review it. Software is one part; your discipline and risk limits are still important. Build your plan: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { contentKey: "threads-gemini-day-16-monthly", title: "Market berubah—good period bukan guarantee", language: "en_ms", dayOffset: 16, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "A strong historical period does not remove future uncertainty. Pasaran boleh berubah, execution boleh berbeza, dan risk tetap ada. Evaluate Gemini Bot EA across your own settings and limits: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { contentKey: "threads-gemini-day-17-questions", title: "Customer journey pun kena clear", language: "en_ms", dayOffset: 17, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Verified access, account binding, installation guide and demo testing—semua ini buat setup lebih kemas. Clear delivery does not remove market risk, but it reduces avoidable confusion. See the Gemini Bot EA flow: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { contentKey: "threads-gemini-day-18-not-shortcut", title: "Banyak trade tak semestinya better result", language: "en_ms", dayOffset: 18, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Trade frequency alone is not the full story. Tengok size, drawdown, costs, exposure and market conditions sebelum judge Gemini Bot EA. Data should help you investigate, bukan ikut hype: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { contentKey: "threads-gemini-day-19-get-started", title: "Ready nak explore Gemini Bot EA?", language: "en_ms", dayOffset: 19, assetUrl: "/manus-storage/IMG_2841_74d86699.PNG", assetAlt: "Owner-supplied Gemini Bot EA second account risk screenshot", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Kalau anda serius nak study MT5 automation, start with the risk note, read the workflow and test on demo. Jangan kejar janji—buat review yang boleh anda explain dan monitor. Visit the portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { contentKey: "threads-gemini-day-20-review", title: "Kalau tak boleh explain, jangan terus automate", language: "en_ms", dayOffset: 20, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Choose only a workflow yang anda faham, boleh monitor and boleh accept risikonya. Gemini Bot EA is an opportunity to evaluate automation, income is never promised. Review the full details before you decide: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
];

export const GEMINI_BOT_THREADS_ADDITIONS: MarketingDraftSeed[] = [
  { contentKey: "threads-gemini-day-21-quick-start", title: "Nak start? Jangan skip the checklist", language: "en_ms", dayOffset: 21, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Nak start Gemini Bot EA? Jangan skip the basics—read the guide, check your MT5 environment and run a demo test dulu. If the workflow fits your style, then you can decide with more confidence. Explore now: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { contentKey: "threads-gemini-day-22-monitor", title: "Automation tak bermaksud boleh tinggal", language: "en_ms", dayOffset: 22, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Gemini Bot EA boleh follow configured rules, but you still need to monitor spread, exposure, drawdown and execution. Nak automation yang lebih disciplined? Start by understanding what you are running: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #RiskManagement #MT5 #DemoFirst" },
  { contentKey: "threads-gemini-day-23-fit", title: "Bukan untuk semua account—check dulu", language: "en_ms", dayOffset: 23, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Different balance, broker and settings can produce different behavior. Sebelum decide nak guna Gemini Bot EA, review the workflow against your own risk limits. Jangan copy blindly—test properly: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #TradingMalaysia #RiskFirst #MT5" },
  { contentKey: "threads-gemini-day-24-system", title: "Kalau serious, treat it like a system", language: "en_ms", dayOffset: 24, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Serious traders know the difference between hype and a process. Gemini Bot EA gives you a structured MT5 workflow to study, configure and monitor. Bukan income guarantee—it's a system you must understand: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #DemoFirst #TradingMalaysia" },
  { contentKey: "threads-gemini-day-25-decision", title: "Last step: decide dengan kepala sendiri", language: "en_ms", dayOffset: 25, destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", caption: "Dah review the rules, risk note and demo flow? Then decide whether Gemini Bot EA fits your trading plan. No hype, no shortcut—just clear information before you commit: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #DemoFirst" },
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

export const ARCHIVED_MARKETING_FLAG = "superseded_by_gemini_20_day_campaign";

export function isArchivedMarketingContent(item: { status: string; complianceFlags: string | null }) {
  return item.status === "rejected" && Boolean(item.complianceFlags?.includes(ARCHIVED_MARKETING_FLAG));
}

export async function listMarketingContent() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select().from(marketingContentItems).orderBy(asc(marketingContentItems.scheduledFor), asc(marketingContentItems.id));
}

export async function cleanupArchivedMarketingContent(_actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ id: marketingContentItems.id }).from(marketingContentItems).where(and(eq(marketingContentItems.status, "rejected"), like(marketingContentItems.complianceFlags, `%${ARCHIVED_MARKETING_FLAG}%`)));
  let deleted = 0;
  for (const row of rows) {
    const result = await db.delete(marketingContentItems).where(and(eq(marketingContentItems.id, row.id), eq(marketingContentItems.status, "rejected")));
    if (result[0]?.affectedRows) deleted += 1;
  }
  return { success: true, deleted, remaining: rows.length - deleted };
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

export async function applyGeminiBotThreadsAdditions(actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  let created = 0;
  let current = 0;
  let skipped = 0;
  for (const draft of GEMINI_BOT_THREADS_ADDITIONS) {
    const [existing] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.contentKey, draft.contentKey)).limit(1);
    const hash = contentHash(draft);
    if (!existing) {
      const result = await db.insert(marketingContentItems).values({ contentKey: draft.contentKey, title: draft.title, caption: draft.caption, language: draft.language, assetUrl: draft.assetUrl ?? null, assetAlt: draft.assetAlt ?? null, destinationUrl: draft.destinationUrl ?? studioDestination, riskNotice: MARKETING_RISK_NOTICE, scheduledFor: pilotScheduledFor(draft.dayOffset), status: "draft", complianceStatus: "passed", complianceFlags: JSON.stringify([]), contentHash: hash });
      const contentItemId = Number(result[0].insertId);
      await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "revised", contentHash: hash, note: "Gemini Bot EA rojak campaign addition" });
      created += 1;
    } else if (existing.status !== "draft") {
      skipped += 1;
    } else if (existing.contentHash === hash) {
      current += 1;
    }
  }
  return { created, current, skipped };
}

export const GEMINI_EVENT_PORTAL_URL = "https://fizuxea-jxctlods.manus.space/portal";

export type GeminiScreenshotEventType = "setup" | "take_profit" | "tp1_hit" | "tp2_hit" | "tp3_hit";

export function buildGeminiEventMarketingCaption({ eventType, occurredLabel, symbol }: { eventType: GeminiScreenshotEventType; occurredLabel: string; symbol?: string }) {
  const eventLabel = eventType === "tp1_hit" ? "TP1 hit event" : eventType === "tp2_hit" ? "TP2 hit event" : eventType === "tp3_hit" ? "TP3 hit event" : eventType === "take_profit" ? "take-profit event" : "setup event";
  const symbolContext = symbol ? ` Symbol: ${symbol.slice(0, 20)}.` : "";
  const channelContext = eventType === "tp1_hit" || eventType === "tp2_hit" || eventType === "tp3_hit" ? " Private Telegram access is controlled; use the portal for the workflow." : "";
  return `Gemini Bot EA ${eventLabel} observed at ${occurredLabel}.${symbolContext}${channelContext} Owner-supplied event evidence only, not a promise or forecast. Semak konteks penuh, drawdown, kos dan execution context. Portal: ${GEMINI_EVENT_PORTAL_URL} #GeminiBotEA #MT5 #RiskFirst`;
}

export async function createGeminiVpsEventDraft({ eventId, eventType, screenshot, screenshotMimeType, occurredAt, accountLabel, symbol, profitAmount, actorUserId }: { eventId: string; eventType: GeminiScreenshotEventType; screenshot: Buffer; screenshotMimeType: "image/png" | "image/jpeg" | "image/webp"; occurredAt?: string; accountLabel?: string; symbol?: string; profitAmount?: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const safeEventId = eventId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
  if (!safeEventId) throw new Error("eventId is required");
  const contentKey = `threads-gemini-vps-event-${safeEventId}`;
  const [existing] = await db.select({ id: marketingContentItems.id, status: marketingContentItems.status }).from(marketingContentItems).where(eq(marketingContentItems.contentKey, contentKey)).limit(1);
  if (existing) return { created: false, contentItemId: existing.id, status: existing.status };

  const stored = await storagePut(`threads/gemini-vps-events/${safeEventId}.png`, screenshot, screenshotMimeType);
  const eventLabel = eventType === "tp1_hit" ? "TP1 hit event" : eventType === "tp2_hit" ? "TP2 hit event" : eventType === "tp3_hit" ? "TP3 hit event" : eventType === "take_profit" ? "take-profit event" : "setup event";
  const occurredLabel = occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString();
  const caption = buildGeminiEventMarketingCaption({ eventType, occurredLabel, symbol });
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
    complianceFlags: JSON.stringify(["evergreen_vps_event", "no_expiry", "signal_screenshot_owner_review", "telegram_channel_marketing_review", "approval_required", `event_type_${eventType}`]),
    contentHash: hash,
  });
  const contentItemId = Number(result[0].insertId);
  await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "revised", contentHash: hash, note: `Evergreen VPS ${eventLabel} screenshot draft created; approval required` });
  return { created: true, contentItemId, status: "draft" as const, assetUrl: stored.url };
}

export const EVERGREEN_GEMINI_COPY_BANK = [
  { title: "Nak automate MT5 dengan lebih teratur?", caption: "Nak explore Gemini Bot EA? This is your chance to study a structured MT5 workflow—rules, setup, demo test, then monitor. Bukan magic button, tapi serious tool for traders yang mahu lebih systematic. Profit is never promised. Check portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { title: "Jangan terus attach—buat 4 checks dulu", caption: "Before attach Gemini Bot EA, check symbol, MT5 permission, lot sizing and spread. Simple checks, big difference untuk elak setup mistake. Start smart, test on demo dulu, then decide. Tengok full workflow: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { title: "Opportunity ada, tapi kena faham process", caption: "Kalau anda curious dengan Gemini Bot EA, jangan ikut screenshot semata-mata. Study the process, test on demo, dan tengok sama ada workflow ini sesuai dengan risk tolerance anda. Explore sekarang: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { title: "Screenshot nampak menarik, tapi context lagi penting", caption: "One trade screenshot can catch attention—but it is not your forecast. Tengok entry, exit, size, timing, drawdown and market condition sebelum buat keputusan. Evidence untuk study, bukan promise. Review portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { title: "Profit dan loss memang datang satu package", caption: "Dalam trading, winning period dan losing period boleh berlaku bersama. Gemini Bot EA helps execute configured MT5 rules, but volatility, slippage and broker conditions tetap wujud. Faham risk dulu: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { title: "Kalau nak cuba EA, mula dengan setup yang betul", caption: "Interested nak try Gemini Bot EA? Review installation, account binding, settings, demo testing and monitoring. Bila process clear, lebih senang anda decide dengan kepala sendiri. Start your review here: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { title: "Same EA, different account—jangan compare membuta", caption: "Results boleh berbeza ikut balance, settings, broker execution, spread dan market regime. Sebab itu Gemini Bot EA perlu diuji ikut keadaan akaun anda sendiri, bukan copy result orang. Explore dengan lebih bijak: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { title: "Curious? Turn it into a proper demo test", caption: "Tak perlu rush. Read the guide, attach Gemini Bot EA on demo, monitor behavior and record what you see. Itu cara paling practical untuk tahu workflow ini fit atau tidak dengan cara trading anda: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { title: "Sebelum subscribe, tanya soalan yang betul", caption: "What can I lose? How will I monitor? What if market conditions change? Soalan simple, tapi penting. Gemini Bot EA is for traders who mahu study automation—not chase certainty. Read before deciding: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { title: "Bot boleh execute, tapi judgement tetap milik anda", caption: "Gemini Bot EA can follow configured rules on MT5, tetapi anda masih control the setup, monitoring, broker choice and risk. Automation bukan alasan untuk switch off your judgement. Learn more: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { title: "Jangan tengok result sahaja—tengok drawdown juga", caption: "A better review looks at profit, loss, drawdown, losing streaks, costs and exposure together. Itu yang bantu anda nampak full picture, bukan hanya headline number. Historical evidence is not a forecast: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { title: "Demo first bukan lambat—itu preparation", caption: "Before live funds, verify symbol, permission, lot size and expected behavior on demo. Gemini Bot EA deserves a measured test, bukan keputusan terburu-buru sebab nampak one good screenshot: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { title: "Bukti yang bagus buat kita tanya soalan lebih baik", caption: "Owner-supplied performance evidence boleh bantu anda investigate timing, sizing and conditions. Tapi jangan anggap result itu akan repeat pada account anda. Study the details here: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { title: "Jangan lupa trading costs dalam kira-kira", caption: "Spread, slippage, commission, swap and execution boleh affect your result. Kalau nak evaluate Gemini Bot EA, kira semua costs—not just the attractive gross number. Make an informed decision: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { title: "Automation yang serius perlukan operating plan", caption: "Sebelum guna Gemini Bot EA, decide how you will configure, monitor, pause and review it. Software is one part; your discipline and risk limits are still important. Build your plan: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { title: "Market berubah—good period bukan guarantee", caption: "A strong historical period does not remove future uncertainty. Pasaran boleh berubah, execution boleh berbeza, dan risk tetap ada. Evaluate Gemini Bot EA across your own settings and limits: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { title: "Customer journey pun kena clear", caption: "Verified access, account binding, installation guide and demo testing—semua ini buat setup lebih kemas. Clear delivery does not remove market risk, but it reduces avoidable confusion. See the Gemini Bot EA flow: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { title: "Banyak trade tak semestinya better result", caption: "Trade frequency alone is not the full story. Tengok size, drawdown, costs, exposure and market conditions sebelum judge Gemini Bot EA. Data should help you investigate, bukan ikut hype: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #XAUUSD #RiskManagement #MT5" },
  { title: "Ready nak explore Gemini Bot EA?", caption: "Kalau anda serius nak study MT5 automation, start with the risk note, read the workflow and test on demo. Jangan kejar janji—buat review yang boleh anda explain dan monitor. Visit the portal: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst" },
  { title: "Kalau tak boleh explain, jangan terus automate", caption: "Choose only a workflow yang anda faham, boleh monitor and boleh accept risikonya. Gemini Bot EA is an opportunity to evaluate automation, income is never promised. Review the full details before you decide: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #TradingSystem #RiskFirst" },
  { title: "Nak start? Jangan skip the checklist", caption: "Nak start Gemini Bot EA? Jangan skip the basics—read the guide, check your MT5 environment and run a demo test dulu. If the workflow fits your style, then you can decide with more confidence. Explore now: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #DemoFirst #TradingMalaysia" },
  { title: "Automation tak bermaksud boleh tinggal", caption: "Gemini Bot EA boleh follow configured rules, but you still need to monitor spread, exposure, drawdown and execution. Nak automation yang lebih disciplined? Start by understanding what you are running: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #RiskManagement #MT5 #DemoFirst" },
  { title: "Bukan untuk semua account—check dulu", caption: "Different balance, broker and settings can produce different behavior. Sebelum decide nak guna Gemini Bot EA, review the workflow against your own risk limits. Jangan copy blindly—test properly: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #TradingMalaysia #RiskFirst #MT5" },
  { title: "Kalau serious, treat it like a system", caption: "Serious traders know the difference between hype and a process. Gemini Bot EA gives you a structured MT5 workflow to study, configure and monitor. Bukan income guarantee—it's a system you must understand: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #AlgorithmicTrading #DemoFirst #TradingMalaysia" },
  { title: "Last step: decide dengan kepala sendiri", caption: "Dah review the rules, risk note and demo flow? Then decide whether Gemini Bot EA fits your trading plan. No hype, no shortcut—just clear information before you commit: https://fizuxea-jxctlods.manus.space/portal #GeminiBotEA #MT5 #RiskManagement #DemoFirst" },
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
  let text: string;
  try {
    text = buildThreadsPublicationText(item.caption, item.riskNotice);
  } catch (error) {
    const code = error instanceof ThreadsPublishError ? error.code : "INVALID_TEXT";
    const message = error instanceof Error ? error.message : "The approved Threads text must contain 1–500 characters";
    await db.update(marketingContentItems).set({ status: "publish_failed", publishErrorCode: code.slice(0, 64), publishErrorMessage: message.slice(0, 255) }).where(and(eq(marketingContentItems.id, item.id), eq(marketingContentItems.status, "publish_pending"), eq(marketingContentItems.publishAttemptKey, attemptKey)));
    await db.insert(marketingContentAudits).values({ contentItemId: item.id, actorUserId, action: "publish_failed", contentHash: item.contentHash, note: `${code}: ${message}`.slice(0, 255) });
    throw new Error(`Automatic Threads publication failed (${code}). ${message}`);
  }
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

export async function rejectMarketingContent({ contentItemId, actorUserId: _actorUserId, note: _note }: { contentItemId: number; actorUserId: number; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, contentItemId)).limit(1);
  if (!item) throw new Error("Marketing draft not found");
  if (item.status !== "draft" && item.status !== "publish_failed") throw new Error("Only an unposted draft or failed draft can be permanently rejected");
  const deletion = await db.delete(marketingContentItems).where(and(eq(marketingContentItems.id, contentItemId), eq(marketingContentItems.status, item.status)));
  if (!deletion[0]?.affectedRows) throw new Error("This draft is already removed or has changed");
  return { success: true, deleted: true, contentItemId };
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
