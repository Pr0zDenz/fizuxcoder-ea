import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock, publishThreadsPostMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), publishThreadsPostMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./threadsPublisher", () => ({
  publishThreadsPost: publishThreadsPostMock,
  ThreadsPublishError: class ThreadsPublishError extends Error {
    constructor(public readonly code: string, message: string) { super(message); }
  },
}));

import { GEMINI_BOT_THREADS_REVISION, TWO_WEEK_THREADS_PILOT, applyGeminiBotThreadsRevision, approveMarketingContent, createEvergreenGeminiDraftAfterPublish, markMarketingContentPosted } from "./marketingStudio";

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
  const insertValues = vi.fn().mockResolvedValue([{ insertId: 100 }]);
  const db = {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  getDbMock.mockResolvedValue(db);
  return { db, updateSet, updateWhere, insertValues };
}

function mockMissingDatabase() {
  const selectLimit = vi.fn().mockResolvedValue([]);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const insertValues = vi.fn().mockResolvedValue([{ insertId: 100 }]);
  const db = {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })) })),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  getDbMock.mockResolvedValue(db);
  return { db, insertValues };
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

    await expect(approveMarketingContent({ contentItemId: 9, actorUserId: 1 })).resolves.toEqual({ success: true, externalPostId: "threads-post-1", hasImage: true, replenishment: { created: false, contentItemId: 9 } });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "publish_pending", approvedByUserId: 1 }));
    expect(publishThreadsPostMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 1, text: "Gemini Bot EA note\n\nAutomated trading carries risk.", assetUrl: "/manus-storage/gemini.png" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, action: "approved" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, action: "published" }));
  });

  it("creates one fresh unpublished copy after a successful post and records the replenishment audit", async () => {
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 777 }]);
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    getDbMock.mockResolvedValue(db);

    await expect(createEvergreenGeminiDraftAfterPublish({ item: draftItem({ id: 42, contentHash: "c".repeat(64), assetUrl: null, assetAlt: null }), actorUserId: 1 })).resolves.toEqual({ created: true, contentItemId: 777 });
    expect(insertValues).toHaveBeenCalledTimes(2);
    expect(insertValues.mock.calls[0][0]).toEqual(expect.objectContaining({ status: "draft", language: "en_ms", complianceStatus: "passed", complianceFlags: expect.stringContaining("evergreen_replenishment") }));
    expect(insertValues.mock.calls[0][0].caption).toContain("portal");
    expect(insertValues.mock.calls[1][0]).toEqual(expect.objectContaining({ action: "revised", note: expect.stringContaining("Fresh Gemini Bot EA copy replenished") }));
  });

  it("does not create a duplicate fresh draft when the replenishment key already exists", async () => {
    const insertValues = vi.fn();
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 778, status: "draft" }]) })) })) })),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    getDbMock.mockResolvedValue(db);

    await expect(createEvergreenGeminiDraftAfterPublish({ item: draftItem({ id: 42, contentHash: "c".repeat(64) }), actorUserId: 1 })).resolves.toEqual({ created: false, contentItemId: 778 });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("keeps the seeded pilot educational and free of return promises", () => {
    expect(TWO_WEEK_THREADS_PILOT).toHaveLength(10);
    const allCaptions = TWO_WEEK_THREADS_PILOT.map(item => item.caption.toLowerCase()).join(" ");
    expect(allCaptions).not.toMatch(/guaranteed returns?|risk-free automation|passive income|\bwin rate\b|guaranteed profit/);
  });

  it("creates the twenty-draft Gemini Bot EA campaign when the desired keys are missing", async () => {
    const { insertValues } = mockMissingDatabase();

    await expect(applyGeminiBotThreadsRevision(1)).resolves.toEqual({ created: 20, revised: 0, current: 0, skipped: 0, archived: 0 });
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ title: "A clearer way to explore MT5 automation", language: "en_ms", destinationUrl: "https://fizuxea-jxctlods.manus.space/portal", status: "draft", complianceStatus: "passed" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, action: "revised", note: "Gemini Bot EA 20-day campaign created" }));
  });

  it("does not overwrite an approved or posted caption during the Gemini Bot EA revision", async () => {
    const { updateSet } = mockDatabase(draftItem({ status: "approved", contentHash: "old-hash" }));

    await expect(applyGeminiBotThreadsRevision(1)).resolves.toEqual({ created: 0, revised: 0, current: 0, skipped: 20, archived: 0 });
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("keeps the Gemini Bot EA revision factual, risk-balanced, and separate from 3S performance claims", () => {
    const captions = GEMINI_BOT_THREADS_REVISION.map(item => `${item.title} ${item.caption}`).join(" ").toLowerCase();

    expect(GEMINI_BOT_THREADS_REVISION).toHaveLength(20);
    expect(captions).toContain("gemini bot ea");
    expect(captions).toContain("berminat");
    expect(captions).toContain("portal");
    expect(GEMINI_BOT_THREADS_REVISION.every(item => item.language === "en_ms")).toBe(true);
    expect(captions).not.toMatch(/guaranteed returns?|risk-free automation|passive income|\bwin rate\b|guaranteed profit/);
    expect(captions).not.toContain("3s universal ea");
    expect(GEMINI_BOT_THREADS_REVISION.filter(item => item.assetUrl)).toHaveLength(13);
    expect(new Set(GEMINI_BOT_THREADS_REVISION.map(item => item.contentKey)).size).toBe(20);
    for (const draft of GEMINI_BOT_THREADS_REVISION) {
      expect(draft.caption.length).toBeLessThanOrEqual(500);
      expect(draft.caption.match(/#[A-Za-z0-9_]+/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(draft.caption.match(/#[A-Za-z0-9_]+/g)?.length ?? 0).toBeLessThanOrEqual(5);
      expect(draft.caption).not.toMatch(/guaranteed returns?|guaranteed profit|risk[- ]free|passive income|fixed returns?/i);
    }
  });
});
