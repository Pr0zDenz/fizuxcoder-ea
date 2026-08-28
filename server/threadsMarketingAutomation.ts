import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  marketingContentAudits,
  marketingContentItems,
  threadsMarketingAutomationAudits,
  threadsMarketingAutomationSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { createEvergreenGeminiDraftAfterPublish, MARKETING_RISK_NOTICE } from "./marketingStudio";
import { buildThreadsPublicationText, publishThreadsPost, ThreadsPublishError } from "./threadsPublisher";

export const THREADS_MARKETING_AUTOMATION_KEY = "owner_threads_marketing";
export const THREADS_MARKETING_TIMEZONE = "Asia/Kuala_Lumpur";
/** 09:00, 13:00, and 21:00 MYT in UTC. It remains paused until the owner explicitly enables it. */
export const DEFAULT_THREADS_MARKETING_CRON = "0 0 1,5,13 * * *";

const TELEGRAM_GROWTH_SEEDS = [
  {
    contentKey: "threads-telegram-growth-process",
    title: "Observe the Gemini Bot EA signal process",
    caption: "Kalau interested dengan EA signal workflow, observe dulu. Review a few setups, understand how TP/SL updates work, then test your own plan on demo. Jangan rush sebab one screenshot. Join the channel:",
  },
  {
    contentKey: "threads-telegram-growth-context",
    title: "Signal context matters more than one screenshot",
    caption: "Nak follow Gemini Bot EA signal dengan lebih clear? Jangan tengok one screenshot saja—review symbol, direction, TP/SL updates, then decide ikut your own risk plan. Join the channel:",
  },
  {
    contentKey: "threads-telegram-growth-observe",
    title: "Observe first, then decide your own plan",
    caption: "Signal boleh help you observe market workflow, but it is not for copy blindly. Tengok full setup context dulu, understand the TP/SL updates, then test your own plan on demo. Join the channel:",
  },
] as const;

const ECOSYSTEM_GROWTH_SEEDS = [
  {
    contentKey: "threads-ecosystem-two-eas",
    title: "Satu ecosystem. Dua EA. Bukan satu shortcut.",
    caption: "Nak faham FizuxCoder dengan lebih jelas? Gemini Bot EA fokus pada setup dan signal workflow. 3 Serangkai EA pula guna macro, basket dan Safe TP workflow. Dua approach berbeza—tetapi disiplin, semakan dan risk awareness tetap penting. Observe dulu dalam private channel:",
    assetUrl: "/manus-storage/fizuxcoder-ecosystem-infographic-a_f14c1b85.png",
    assetAlt: "FizuxCoder Gemini Bot EA and 3 Serangkai EA ecosystem infographic",
  },
  {
    contentKey: "threads-ecosystem-workflow",
    title: "Bukan magic button—workflow yang boleh anda semak.",
    caption: "Gemini Bot EA dan 3 Serangkai EA bukan janji market akan ikut kita. Kedua-duanya ialah workflow MT5 yang perlu difahami, dikonfigurasi dan dipantau. Channel ini tunjuk setup serta update sebagai konteks untuk belajar—bukan arahan untuk copy blindly. Observe dulu:",
    assetUrl: "/manus-storage/fizuxcoder-ecosystem-infographic-b_31c99bc1.png",
    assetAlt: "FizuxCoder EA workflow, licensing, and private Telegram signal infographic",
  },
  {
    contentKey: "threads-ecosystem-private-channel",
    title: "Signal update yang boleh diikuti dengan lebih teratur.",
    caption: "Dalam private Telegram channel, anda boleh observe setup context dan update TP/SL atau basket outcome yang direkodkan oleh workflow Gemini Bot EA. Ia bukan forecast dan bukan jaminan result. Semak cara sistem berkomunikasi, kemudian test plan sendiri di demo. Join untuk observe:",
    assetUrl: "/manus-storage/fizuxcoder-ecosystem-infographic-a_f14c1b85.png",
    assetAlt: "FizuxCoder risk-aware Expert Advisor ecosystem infographic",
  },
] as const;

type AutomationSettings = typeof threadsMarketingAutomationSettings.$inferSelect;

export function validateTelegramMarketingInviteLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/^\/+/, "");
    return url.protocol === "https:"
      && (host === "t.me" || host === "www.t.me")
      && (path.startsWith("+") || path.startsWith("joinchat/"));
  } catch {
    return false;
  }
}

function configuredInviteLink(): string {
  const inviteLink = ENV.telegramMarketingInviteLink.trim();
  if (!validateTelegramMarketingInviteLink(inviteLink)) {
    throw new Error("The server-only Telegram invite link is not configured or is not a valid private t.me invite link");
  }
  return inviteLink;
}

function inviteAvailable(): boolean {
  return validateTelegramMarketingInviteLink(ENV.telegramMarketingInviteLink);
}

function copyHash(seed: { title: string; caption: string; contentKey: string; assetUrl?: string; assetAlt?: string }) {
  return createHash("sha256").update(JSON.stringify({
    title: seed.title,
    caption: seed.caption,
    language: "en_ms",
    assetUrl: seed.assetUrl ?? null,
    assetAlt: seed.assetAlt ?? null,
    destinationUrl: "https://fizuxea-jxctlods.manus.space/portal",
    riskNotice: MARKETING_RISK_NOTICE,
  })).digest("hex");
}

async function readSettings(ownerUserId: number): Promise<AutomationSettings | null> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [settings] = await db.select().from(threadsMarketingAutomationSettings)
    .where(eq(threadsMarketingAutomationSettings.settingKey, THREADS_MARKETING_AUTOMATION_KEY)).limit(1);
  if (settings && settings.ownerUserId !== ownerUserId) {
    throw new Error("The Threads marketing schedule belongs to a different owner account");
  }
  return settings ?? null;
}

async function ensureSettings(ownerUserId: number): Promise<AutomationSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const existing = await readSettings(ownerUserId);
  if (existing) return existing;
  await db.insert(threadsMarketingAutomationSettings).values({
    settingKey: THREADS_MARKETING_AUTOMATION_KEY,
    ownerUserId,
    timezone: THREADS_MARKETING_TIMEZONE,
    cronExpression: DEFAULT_THREADS_MARKETING_CRON,
    automaticPublishingEnabled: "no",
    killSwitchEngaged: "yes",
    inviteLinkConfigured: inviteAvailable() ? "yes" : "no",
  });
  const created = await readSettings(ownerUserId);
  if (!created) throw new Error("Unable to create the Threads marketing settings");
  await db.insert(threadsMarketingAutomationAudits).values({
    settingKey: THREADS_MARKETING_AUTOMATION_KEY,
    actorUserId: ownerUserId,
    action: "settings_updated",
    note: "Owner Threads marketing automation initialized in paused safe state",
  });
  return created;
}

function publicSettings(settings: AutomationSettings | null, queueCount: number) {
  return {
    configured: Boolean(settings),
    timezone: settings?.timezone ?? THREADS_MARKETING_TIMEZONE,
    cronExpression: settings?.cronExpression ?? DEFAULT_THREADS_MARKETING_CRON,
    automaticPublishingEnabled: settings?.automaticPublishingEnabled ?? "no",
    killSwitchEngaged: settings?.killSwitchEngaged ?? "yes",
    scheduleConfigured: Boolean(settings?.scheduleCronTaskUid),
    inviteLinkConfigured: inviteAvailable(),
    queuedCount: queueCount,
    lastRunAt: settings?.lastRunAt ?? null,
  } as const;
}

export async function getThreadsMarketingAutomationStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const settings = await readSettings(ownerUserId);
  const queue = await db.select({ id: marketingContentItems.id }).from(marketingContentItems).where(and(
    eq(marketingContentItems.status, "approved"),
    eq(marketingContentItems.automationEligible, "yes"),
  ));
  return publicSettings(settings, queue.length);
}

export async function verifyTelegramGrowthInviteLink(ownerUserId: number) {
  configuredInviteLink();
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await ensureSettings(ownerUserId);
  await db.update(threadsMarketingAutomationSettings).set({ inviteLinkConfigured: "yes" })
    .where(eq(threadsMarketingAutomationSettings.settingKey, THREADS_MARKETING_AUTOMATION_KEY));
  await db.insert(threadsMarketingAutomationAudits).values({
    settingKey: THREADS_MARKETING_AUTOMATION_KEY,
    actorUserId: ownerUserId,
    action: "settings_updated",
    note: "Server-only private Telegram invite link validated",
  });
  return getThreadsMarketingAutomationStatus(ownerUserId);
}

/** Creates invitation drafts only. The agreed initial template set may later be approved as one audited campaign; screenshots never use that path. */
export async function prepareTelegramGrowthDrafts(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const inviteLink = configuredInviteLink();
  await verifyTelegramGrowthInviteLink(ownerUserId);
  let created = 0;
  let existing = 0;
  for (const seed of TELEGRAM_GROWTH_SEEDS) {
    const caption = `${seed.caption}\n\n${inviteLink}\n${inviteLink}\n${inviteLink}\n\n•\nTrading involves risk.\n\n#ExpertAdvisor #DemoFirst #TradingMalaysia`;
    const contentKey = `${seed.contentKey}-${createHash("sha256").update(inviteLink).digest("hex").slice(0, 12)}`;
    const [prior] = await db.select({ id: marketingContentItems.id }).from(marketingContentItems)
      .where(eq(marketingContentItems.contentKey, contentKey)).limit(1);
    if (prior) {
      existing += 1;
      continue;
    }
    const title = seed.title;
    const result = await db.insert(marketingContentItems).values({
      contentKey,
      title,
      caption,
      language: "en_ms",
      assetUrl: null,
      assetAlt: null,
      destinationUrl: "https://fizuxea-jxctlods.manus.space/portal",
      riskNotice: MARKETING_RISK_NOTICE,
      scheduledFor: null,
      status: "draft",
      complianceStatus: "passed",
      complianceFlags: JSON.stringify(["telegram_private_invite", "initial_template_approval_required", "not_signal_evidence"]),
      contentHash: copyHash({ ...seed, caption }),
      automationEligible: "no",
    });
    const contentItemId = Number(result[0].insertId);
    await db.insert(marketingContentAudits).values({
      contentItemId,
      actorUserId: ownerUserId,
      action: "revised",
      contentHash: copyHash({ ...seed, caption }),
      note: "Private Telegram invite template created; campaign approval is required before scheduling",
    });
    created += 1;
  }
  return { created, existing };
}

/** Creates owner-review ecosystem education drafts only. They are not part of the pre-approved template set or active schedule. */
export async function prepareEcosystemTelegramGrowthDrafts(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const inviteLink = configuredInviteLink();
  await verifyTelegramGrowthInviteLink(ownerUserId);
  let created = 0;
  let existing = 0;
  for (const seed of ECOSYSTEM_GROWTH_SEEDS) {
    const compactCaption = `${seed.caption.replace(/Observe dulu dalam private channel:|Observe dulu:|Join untuk observe:/, "Observe dulu:")}\n\n${inviteLink}\n\n#ExpertAdvisor #TradingMalaysia #DemoFirst`;
    const contentKey = `${seed.contentKey}-${createHash("sha256").update(inviteLink).digest("hex").slice(0, 12)}`;
    const [prior] = await db.select({ id: marketingContentItems.id, caption: marketingContentItems.caption, status: marketingContentItems.status }).from(marketingContentItems)
      .where(eq(marketingContentItems.contentKey, contentKey)).limit(1);
    if (prior) {
      if ((prior.status === "draft" || prior.status === "publish_failed") && prior.caption !== compactCaption) {
        const repairedDraft = { ...seed, caption: compactCaption };
        const repairedHash = copyHash(repairedDraft);
        await db.update(marketingContentItems).set({ caption: compactCaption, status: "draft", publishErrorCode: null, publishErrorMessage: null, contentHash: repairedHash }).where(eq(marketingContentItems.id, prior.id));
        await db.insert(marketingContentAudits).values({ contentItemId: prior.id, actorUserId: ownerUserId, action: "revised", contentHash: repairedHash, note: "Compacted ecosystem infographic caption to the Threads 500-character limit; owner review remains required" });
      }
      existing += 1;
      continue;
    }
    const draft = { ...seed, caption: compactCaption };
    const hash = copyHash(draft);
    const result = await db.insert(marketingContentItems).values({
      contentKey,
      title: seed.title,
      caption: compactCaption,
      language: "en_ms",
      assetUrl: seed.assetUrl,
      assetAlt: seed.assetAlt,
      destinationUrl: "https://fizuxea-jxctlods.manus.space/portal",
      riskNotice: MARKETING_RISK_NOTICE,
      scheduledFor: null,
      status: "draft",
      complianceStatus: "passed",
      complianceFlags: JSON.stringify(["telegram_private_invite", "ecosystem_education", "generated_infographic_owner_review", "not_initial_template_set", "not_signal_evidence"]),
      contentHash: hash,
      automationEligible: "no",
    });
    const contentItemId = Number(result[0].insertId);
    await db.insert(marketingContentAudits).values({ contentItemId, actorUserId: ownerUserId, action: "revised", contentHash: hash, note: "Gemini and 3 Serangkai ecosystem infographic draft created; explicit owner review is required before scheduling" });
    created += 1;
  }
  return { created, existing };
}

/**
 * Approves only the three fixed private-invite templates as one owner-audited
 * campaign. This deliberately cannot select any VPS event/screenshot record.
 */
export async function approveInitialTelegramGrowthTemplateSet(actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await ensureSettings(actorUserId);
  const templatePrefixes = TELEGRAM_GROWTH_SEEDS.map(seed => `${seed.contentKey}-`);
  const candidates = (await db.select().from(marketingContentItems).where(and(
    eq(marketingContentItems.status, "draft"),
    eq(marketingContentItems.complianceStatus, "passed"),
  ))).filter(item => templatePrefixes.some(prefix => item.contentKey.startsWith(prefix)));
  let approved = 0;
  for (const item of candidates) {
    const transition = await db.update(marketingContentItems).set({
      status: "approved",
      approvedByUserId: actorUserId,
      approvedAt: new Date(),
      automationEligible: "yes",
    }).where(and(
      eq(marketingContentItems.id, item.id),
      eq(marketingContentItems.status, "draft"),
      eq(marketingContentItems.complianceStatus, "passed"),
    ));
    if (!transition[0].affectedRows) continue;
    await db.insert(marketingContentAudits).values({
      contentItemId: item.id,
      actorUserId,
      action: "approved",
      contentHash: item.contentHash,
      note: "Owner approved agreed private Telegram-growth template campaign for scheduled Threads posting",
    });
    approved += 1;
  }
  await db.insert(threadsMarketingAutomationAudits).values({
    settingKey: THREADS_MARKETING_AUTOMATION_KEY,
    actorUserId,
    action: "settings_updated",
    note: `Owner approved ${approved} agreed private Telegram-growth templates; VPS screenshots remain excluded`,
  });
  return { approved, eligible: approved > 0 };
}

/**
 * An owner must actively nominate each exact draft. VPS screenshot drafts are
 * excluded unless selected through this operation after visual review.
 */
export async function setMarketingScheduleEligibility({ contentItemId, actorUserId, eligible }: { contentItemId: number; actorUserId: number; eligible: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await ensureSettings(actorUserId);
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, contentItemId)).limit(1);
  if (!item) throw new Error("Marketing draft not found");
  if (item.complianceStatus !== "passed") throw new Error("Only compliance-passed drafts can enter the scheduled queue");
  if (item.status === "posted" || item.status === "publish_pending" || item.status === "rejected") throw new Error("This marketing item cannot be changed for the scheduled queue");
  if (eligible) {
    if (item.status !== "draft" && item.status !== "approved") throw new Error("Only a reviewable draft can be approved for scheduled publishing");
    const transition = await db.update(marketingContentItems).set({
      status: "approved",
      approvedByUserId: actorUserId,
      approvedAt: new Date(),
      automationEligible: "yes",
    }).where(and(eq(marketingContentItems.id, contentItemId), eq(marketingContentItems.status, item.status)));
    if (!transition[0].affectedRows) throw new Error("This draft changed before it could be approved for the scheduled queue");
    await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "approved", contentHash: item.contentHash, note: "Owner approved exact draft for scheduled Threads queue" });
  } else {
    const transition = await db.update(marketingContentItems).set({ automationEligible: "no" }).where(and(
      eq(marketingContentItems.id, contentItemId),
      eq(marketingContentItems.status, "approved"),
      eq(marketingContentItems.automationEligible, "yes"),
    ));
    if (!transition[0].affectedRows) throw new Error("Only an approved scheduled item can be removed from the queue");
    await db.insert(marketingContentAudits).values({ contentItemId, actorUserId, action: "revised", contentHash: item.contentHash, note: "Owner removed draft from scheduled Threads queue" });
  }
  return { success: true, scheduled: eligible };
}

export async function engageThreadsMarketingKillSwitch(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const settings = await ensureSettings(ownerUserId);
  await db.update(threadsMarketingAutomationSettings).set({ automaticPublishingEnabled: "no", killSwitchEngaged: "yes" })
    .where(eq(threadsMarketingAutomationSettings.settingKey, THREADS_MARKETING_AUTOMATION_KEY));
  await db.insert(threadsMarketingAutomationAudits).values({
    settingKey: THREADS_MARKETING_AUTOMATION_KEY,
    actorUserId: ownerUserId,
    action: "schedule_paused",
    note: settings.scheduleCronTaskUid ? "Kill switch engaged; scheduled publisher will skip all runs" : "Kill switch engaged before any schedule was created",
  });
  return getThreadsMarketingAutomationStatus(ownerUserId);
}

/**
 * Links the platform-created task only after the owner has separately supplied
 * the private invite link and explicitly confirmed automatic publishing.
 */
export async function activateThreadsMarketingSchedule({ ownerUserId, taskUid }: { ownerUserId: number; taskUid: string }) {
  configuredInviteLink();
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const settings = await ensureSettings(ownerUserId);
  const wasConfigured = Boolean(settings.scheduleCronTaskUid);
  await db.update(threadsMarketingAutomationSettings).set({
    scheduleCronTaskUid: taskUid,
    inviteLinkConfigured: "yes",
    automaticPublishingEnabled: "yes",
    killSwitchEngaged: "no",
    cronExpression: DEFAULT_THREADS_MARKETING_CRON,
  }).where(eq(threadsMarketingAutomationSettings.settingKey, THREADS_MARKETING_AUTOMATION_KEY));
  await db.insert(threadsMarketingAutomationAudits).values({
    settingKey: THREADS_MARKETING_AUTOMATION_KEY,
    actorUserId: ownerUserId,
    action: wasConfigured ? "schedule_resumed" : "schedule_created",
    note: wasConfigured ? "Owner explicitly resumed scheduled Threads publisher" : "Owner explicitly enabled three-times-daily scheduled Threads publisher",
  });
  return getThreadsMarketingAutomationStatus(ownerUserId);
}

/** Internal metadata for the router; never returned to a browser. */
export async function getThreadsMarketingTaskUid(ownerUserId: number): Promise<string | null> {
  const settings = await readSettings(ownerUserId);
  return settings?.scheduleCronTaskUid ?? null;
}

/** Called only by the authenticated Heartbeat endpoint. At most one item can leave the queue per run. */
export async function runScheduledThreadsMarketing(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [settings] = await db.select().from(threadsMarketingAutomationSettings).where(and(
    eq(threadsMarketingAutomationSettings.settingKey, THREADS_MARKETING_AUTOMATION_KEY),
    eq(threadsMarketingAutomationSettings.scheduleCronTaskUid, taskUid),
  )).limit(1);
  if (!settings) return { ok: true, skipped: "unknown_task" as const };
  const writeRunAudit = async (action: "run_skipped" | "run_started" | "run_published" | "run_failed", note: string, contentItemId?: number) => {
    await db.insert(threadsMarketingAutomationAudits).values({ settingKey: settings.settingKey, actorUserId: null, contentItemId: contentItemId ?? null, action, note: note.slice(0, 255) });
  };
  await db.update(threadsMarketingAutomationSettings).set({ lastRunAt: new Date() }).where(eq(threadsMarketingAutomationSettings.settingKey, settings.settingKey));
  if (settings.automaticPublishingEnabled !== "yes" || settings.killSwitchEngaged === "yes") {
    await writeRunAudit("run_skipped", "Kill switch is engaged or automatic publishing is disabled");
    return { ok: true, skipped: "paused" as const };
  }
  if (!inviteAvailable()) {
    await writeRunAudit("run_skipped", "Server-only invite link is unavailable; no Threads post attempted");
    return { ok: true, skipped: "invite_unavailable" as const };
  }
  const [item] = await db.select().from(marketingContentItems).where(and(
    eq(marketingContentItems.status, "approved"),
    eq(marketingContentItems.automationEligible, "yes"),
  )).orderBy(asc(marketingContentItems.scheduledFor), asc(marketingContentItems.id)).limit(1);
  if (!item) {
    await writeRunAudit("run_skipped", "No owner-approved eligible marketing draft is queued");
    return { ok: true, skipped: "empty_queue" as const };
  }
  const attemptKey = createHash("sha256").update(`scheduled:${taskUid}:${item.id}:${item.contentHash}`).digest("hex");
  const transition = await db.update(marketingContentItems).set({
    status: "publish_pending",
    publishAttemptKey: attemptKey,
    publishAttemptedAt: new Date(),
    publishErrorCode: null,
    publishErrorMessage: null,
  }).where(and(
    eq(marketingContentItems.id, item.id),
    eq(marketingContentItems.status, "approved"),
    eq(marketingContentItems.automationEligible, "yes"),
  ));
  if (!transition[0].affectedRows) {
    await writeRunAudit("run_skipped", "Candidate changed before atomic publish transition", item.id);
    return { ok: true, skipped: "race_lost" as const };
  }
  await writeRunAudit("run_started", "One owner-approved scheduled item claimed for publication", item.id);
  await db.insert(marketingContentAudits).values({ contentItemId: item.id, actorUserId: settings.ownerUserId, action: "publish_started", contentHash: item.contentHash, note: "Owner-governed scheduled Threads publication started" });
  try {
    const published = await publishThreadsPost({ ownerUserId: settings.ownerUserId, text: buildThreadsPublicationText(item.caption, item.riskNotice), assetUrl: item.assetUrl });
    const completed = await db.update(marketingContentItems).set({
      status: "posted",
      postedByUserId: settings.ownerUserId,
      postedAt: new Date(),
      externalPostId: published.externalPostId,
      publishErrorCode: null,
      publishErrorMessage: null,
    }).where(and(
      eq(marketingContentItems.id, item.id),
      eq(marketingContentItems.status, "publish_pending"),
      eq(marketingContentItems.publishAttemptKey, attemptKey),
    ));
    if (!completed[0].affectedRows) throw new Error("Publication state changed unexpectedly after provider success; inspect audit before retrying");
    await db.insert(marketingContentAudits).values({ contentItemId: item.id, actorUserId: settings.ownerUserId, action: "published", contentHash: item.contentHash, note: published.hasImage ? "Scheduled Threads publication succeeded with one image" : "Scheduled Threads publication succeeded as text-only" });
    await writeRunAudit("run_published", `Threads post confirmed: ${published.externalPostId}`, item.id);
    try {
      await createEvergreenGeminiDraftAfterPublish({ item, actorUserId: settings.ownerUserId });
    } catch (replenishmentError) {
      console.error("[Threads automation] Published post but evergreen replenishment failed", replenishmentError);
    }
    return { ok: true, posted: item.id, externalPostId: published.externalPostId };
  } catch (error) {
    const code = error instanceof ThreadsPublishError ? error.code : "PUBLISH_ERROR";
    const message = error instanceof Error ? error.message : "Threads publication failed";
    await db.update(marketingContentItems).set({ status: "publish_failed", publishErrorCode: code.slice(0, 64), publishErrorMessage: message.slice(0, 255) }).where(and(
      eq(marketingContentItems.id, item.id),
      eq(marketingContentItems.status, "publish_pending"),
      eq(marketingContentItems.publishAttemptKey, attemptKey),
    ));
    await db.insert(marketingContentAudits).values({ contentItemId: item.id, actorUserId: settings.ownerUserId, action: "publish_failed", contentHash: item.contentHash, note: `Scheduled queue ${code}: ${message}`.slice(0, 255) });
    await writeRunAudit("run_failed", `${code}: ${message}`, item.id);
    return { ok: false, failed: item.id, errorCode: code };
  }
}
