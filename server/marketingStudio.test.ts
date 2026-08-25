import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock, publishThreadsPostMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), publishThreadsPostMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./threadsPublisher", () => ({
  publishThreadsPost: publishThreadsPostMock,
  ThreadsPublishError: class ThreadsPublishError extends Error {
    constructor(public readonly code: string, message: string) { super(message); }
  },
}));

import { GEMINI_BOT_THREADS_REVISION, TWO_WEEK_THREADS_PILOT, applyGeminiBotThreadsRevision, approveMarketingContent, markMarketingContentPosted } from "./marketingStudio";

function draftItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    status: "draft",
    complianceStatus: "passed",
    contentHash: "a".repeat(64),
    caption: "Gemini Bot EA note",
    riskNotice: "Automated trading carries risk.",
    assetUrl: "/manus-storage/gemini.png",
    ...overrides,
  };
}

function mockDatabase(item: Record<string, unknown>) {
  const selectLimit = vi.fn().mockResolvedValue([item]);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const db = {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  getDbMock.mockResolvedValue(db);
  return { db, updateSet, updateWhere, insertValues };
}

describe("private marketing studio safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publishThreadsPostMock.mockResolvedValue({ externalPostId: "threads-post-1", hasImage: true });
  });

  it("does not allow an unapproved draft to be marked as manually posted", async () => {
    const { updateSet } = mockDatabase(draftItem({ status: "draft" }));

    await expect(markMarketingContentPosted({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("Manual posting is available only for legacy approved records");
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("does not approve a draft until its compliance review has passed", async () => {
    const { updateSet } = mockDatabase(draftItem({ complianceStatus: "pending" }));

    await expect(approveMarketingContent({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("Resolve compliance review before publishing this draft");
    expect(updateSet).not.toHaveBeenCalled();
    expect(publishThreadsPostMock).not.toHaveBeenCalled();
  });

  it("publishes the approved caption with its required notice and selected image", async () => {
    const { updateSet, insertValues } = mockDatabase(draftItem({ status: "draft", complianceStatus: "passed" }));

    await expect(approveMarketingContent({ contentItemId: 9, actorUserId: 1 })).resolves.toEqual({ success: true, externalPostId: "threads-post-1", hasImage: true });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "publish_pending", approvedByUserId: 1 }));
    expect(publishThreadsPostMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 1, text: "Gemini Bot EA note\n\nAutomated trading carries risk.", assetUrl: "/manus-storage/gemini.png" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, action: "approved" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, action: "published" }));
  });

  it("keeps the seeded pilot educational and free of return promises", () => {
    expect(TWO_WEEK_THREADS_PILOT).toHaveLength(10);
    const allCaptions = TWO_WEEK_THREADS_PILOT.map(item => item.caption.toLowerCase()).join(" ");
    expect(allCaptions).not.toMatch(/guaranteed returns?|risk-free automation|passive income|\bwin rate\b|guaranteed profit/);
  });

  it("revises only unapproved drafts into the Gemini Bot EA campaign and records each revision", async () => {
    const { updateSet, insertValues } = mockDatabase(draftItem({ contentHash: "old-hash" }));

    await expect(applyGeminiBotThreadsRevision(1)).resolves.toEqual({ revised: 10, current: 0, skipped: 0 });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ title: "Gemini Bot EA is not a shortcut around risk", status: "draft", complianceStatus: "passed" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, action: "revised", note: "Gemini Bot EA-only Threads revision" }));
  });

  it("does not overwrite an approved or posted caption during the Gemini Bot EA revision", async () => {
    const { updateSet } = mockDatabase(draftItem({ status: "approved", contentHash: "old-hash" }));

    await expect(applyGeminiBotThreadsRevision(1)).resolves.toEqual({ revised: 0, current: 0, skipped: 10 });
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("keeps the Gemini Bot EA revision factual, risk-balanced, and separate from 3S performance claims", () => {
    const captions = GEMINI_BOT_THREADS_REVISION.map(item => `${item.title} ${item.caption}`).join(" ").toLowerCase();

    expect(GEMINI_BOT_THREADS_REVISION).toHaveLength(10);
    expect(captions).toContain("gemini bot ea");
    expect(captions).not.toMatch(/guaranteed returns?|risk-free automation|passive income|\bwin rate\b|guaranteed profit/);
    expect(captions).not.toContain("3s universal ea");
    expect(GEMINI_BOT_THREADS_REVISION.filter(item => item.assetUrl)).toHaveLength(5);
  });
});
