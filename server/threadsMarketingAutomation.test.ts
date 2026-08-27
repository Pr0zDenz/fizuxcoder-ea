import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const { getDbMock, publishThreadsPostMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), publishThreadsPostMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./threadsPublisher", () => ({
  publishThreadsPost: publishThreadsPostMock,
  ThreadsPublishError: class ThreadsPublishError extends Error {
    constructor(public readonly code: string, message: string) { super(message); }
  },
}));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

import { approveInitialTelegramGrowthTemplateSet, DEFAULT_THREADS_MARKETING_CRON, runScheduledThreadsMarketing, validateTelegramMarketingInviteLink } from "./threadsMarketingAutomation";

const source = readFileSync(new URL("./threadsMarketingAutomation.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("./threadsMarketingScheduleRoute.ts", import.meta.url), "utf8");
const intakeSource = readFileSync(new URL("./marketingStudio.ts", import.meta.url), "utf8");

function nestedSelect(rows: unknown[]) {
  return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })) })) };
}

function pausedSettings() {
  return {
    settingKey: "owner_threads_marketing",
    ownerUserId: 1,
    automaticPublishingEnabled: "no",
    killSwitchEngaged: "yes",
    scheduleCronTaskUid: "cron-task-1",
  };
}

describe("private Telegram invite Threads automation safeguards", () => {
  it("accepts only HTTPS private Telegram invite forms", () => {
    expect(validateTelegramMarketingInviteLink("https://t.me/+GBR_Ih_W0gAwYjI1")).toBe(true);
    expect(validateTelegramMarketingInviteLink("https://t.me/joinchat/AbCdEf0123")).toBe(true);
    expect(validateTelegramMarketingInviteLink("https://t.me/public_channel")).toBe(false);
    expect(validateTelegramMarketingInviteLink("http://t.me/+unsafe")).toBe(false);
    expect(validateTelegramMarketingInviteLink("https://example.com/+unsafe")).toBe(false);
  });

  it("accepts the configured server-only private invite before it can be used by the marketing workflow", () => {
    const configuredInvite = process.env.TELEGRAM_MARKETING_INVITE_LINK ?? "";
    expect(validateTelegramMarketingInviteLink(configuredInvite)).toBe(true);
  });

  it("retains the owner-required Threads layout for private invite drafts", () => {
    expect(source).toContain("${inviteLink}\\n${inviteLink}\\n${inviteLink}");
    expect(source).toContain("\\n\\n•\\nTrading involves risk.\\n\\n#ExpertAdvisor #DemoFirst #TradingMalaysia");
    expect(source).toContain("Jangan rush sebab one screenshot. Join the channel:");
  });

  it("approves only the agreed template set and leaves a VPS screenshot out of the bulk queue", async () => {
    const settings = { settingKey: "owner_threads_marketing", ownerUserId: 1 };
    const template = { id: 10, contentKey: "threads-telegram-growth-process-abc123", status: "draft", complianceStatus: "passed", contentHash: "template-hash" };
    const screenshot = { id: 11, contentKey: "threads-gemini-vps-event-event-123", status: "draft", complianceStatus: "passed", contentHash: "screenshot-hash" };
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(nestedSelect([settings]))
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([template, screenshot]) })) }),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    getDbMock.mockResolvedValue(db);

    await expect(approveInitialTelegramGrowthTemplateSet(1)).resolves.toEqual({ approved: 1, eligible: true });
    expect(updateWhere).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ contentItemId: 10 }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ note: expect.stringContaining("VPS screenshots remain excluded") }));
  });

  it("uses the proposed three-per-day Malaysia schedule as a UTC six-field cron expression", () => {
    expect(DEFAULT_THREADS_MARKETING_CRON).toBe("0 0 1,5,13 * * *");
  });

  it("does not publish when a cron task is not persisted to an owner campaign", async () => {
    const db = {
      select: vi.fn(() => nestedSelect([])),
      update: vi.fn(),
      insert: vi.fn(),
    };
    getDbMock.mockResolvedValue(db);

    await expect(runScheduledThreadsMarketing("unknown-cron-task")).resolves.toEqual({ ok: true, skipped: "unknown_task" });
    expect(publishThreadsPostMock).not.toHaveBeenCalled();
  });

  it("does not publish while the default kill switch remains engaged", async () => {
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const db = {
      select: vi.fn(() => nestedSelect([pausedSettings()])),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    getDbMock.mockResolvedValue(db);

    await expect(runScheduledThreadsMarketing("cron-task-1")).resolves.toEqual({ ok: true, skipped: "paused" });
    expect(publishThreadsPostMock).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ action: "run_skipped" }));
  });

  it("keeps raw VPS screenshot drafts out of the queue until an administrator explicitly enrols them", () => {
    expect(intakeSource).toContain('status: "draft"');
    expect(source).toContain('eq(marketingContentItems.automationEligible, "yes")');
    expect(source).toContain("Owner approved exact draft for scheduled Threads queue");
    expect(source).toContain("approveInitialTelegramGrowthTemplateSet");
    expect(source).toContain("This deliberately cannot select any VPS event/screenshot record");
    expect(source).toContain("threads-telegram-growth-");
    expect(source).not.toContain("threads-gemini-vps-event-templates");
  });

  it("requires cron identity and a verified task UID at the scheduled HTTP boundary", () => {
    expect(routeSource).toContain("sdk.authenticateRequest(req)");
    expect(routeSource).toContain("!user.isCron || !user.taskUid");
    expect(routeSource).not.toContain("req.body.taskUid");
  });
});
