import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock, publishThreadsPostMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), publishThreadsPostMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./threadsPublisher", () => {
  class MockThreadsPublishError extends Error {
    constructor(public readonly code: string, message: string) { super(message); }
  }
  return {
    publishThreadsPost: publishThreadsPostMock,
    ThreadsPublishError: MockThreadsPublishError,
    buildThreadsPublicationText: (caption: string, riskNotice?: string | null) => {
      const text = riskNotice ? `${caption.trim()}\n\n${riskNotice.trim()}` : caption.trim();
      if (!text || text.length > 500) throw new MockThreadsPublishError("INVALID_TEXT", "The approved Threads text must contain 1–500 characters");
      return text;
    },
  };
});

import { ARCHIVED_MARKETING_FLAG, GEMINI_BOT_THREADS_ADDITIONS, GEMINI_BOT_THREADS_REVISION, TWO_WEEK_THREADS_PILOT, applyGeminiBotThreadsAdditions, applyGeminiBotThreadsRevision, approveMarketingContent, cleanupArchivedMarketingContent, createEvergreenGeminiDraftAfterPublish, isArchivedMarketingContent, markMarketingContentPosted, rejectMarketingContent } from "./marketingStudio";

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
  const deleteWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
  const db = {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: insertValues })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };
  getDbMock.mockResolvedValue(db);
  return { db, updateSet, updateWhere, insertValues, deleteWhere };
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
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })),
  };
  getDbMock.mockResolvedValue(db);
  return { db, insertValues };
}

describe("private marketing studio safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publishThreadsPostMock.mockResolvedValue({ externalPostId: "threads-post-1", hasImage: true });
  });

  it("classifies only explicitly superseded rejected content as archived", () => {
    expect(isArchivedMarketingContent({ status: "rejected", complianceFlags: JSON.stringify([ARCHIVED_MARKETING_FLAG]) })).toBe(true);
    expect(isArchivedMarketingContent({ status: "rejected", complianceFlags: JSON.stringify(["signal_screenshot_owner_review"]) })).toBe(false);
    expect(isArchivedMarketingContent({ status: "draft", complianceFlags: JSON.stringify([ARCHIVED_MARKETING_FLAG]) })).toBe(false);
  });

  it("cleans only explicitly archived records and reports partial deletion safely", async () => {
    const selectWhere = vi.fn().mockResolvedValue([{ id: 9 }, { id: 10 }]);
    const deleteWhere = vi.fn()
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhere })) })),
      delete: vi.fn(() => ({ where: deleteWhere })),
    };
    getDbMock.mockResolvedValue(db);

    await expect(cleanupArchivedMarketingContent(1)).resolves.toEqual({ success: true, deleted: 1, remaining: 1 });
    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(deleteWhere).toHaveBeenCalledTimes(2);
  });

  it("is idempotent when no explicit archived records remain", async () => {
    const selectWhere = vi.fn().mockResolvedValue([]);
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhere })) })),
      delete: vi.fn(),
    };
    getDbMock.mockResolvedValue(db);

    await expect(cleanupArchivedMarketingContent(1)).resolves.toEqual({ success: true, deleted: 0, remaining: 0 });
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("permanently removes an owner-rejected draft and does not create a rejected content record", async () => {
    const { db, deleteWhere, insertValues } = mockDatabase(draftItem({ status: "draft" }));

    await expect(rejectMarketingContent({ contentItemId: 9, actorUserId: 1, note: "Not suitable for campaign" })).resolves.toEqual({ success: true, deleted: true, contentItemId: 9 });
    expect(db.delete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("does not permanently remove posted or already approved content through rejection", async () => {
    const posted = mockDatabase(draftItem({ status: "posted" }));
    await expect(rejectMarketingContent({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("Only an unposted draft or failed draft");
    expect(posted.db.delete).not.toHaveBeenCalled();

    const approved = mockDatabase(draftItem({ status: "approved" }));
    await expect(rejectMarketingContent({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("Only an unposted draft or failed draft");
    expect(approved.db.delete).not.toHaveBeenCalled();
  });

  it("fails closed when the rejected draft was removed concurrently", async () => {
    const { db, deleteWhere } = mockDatabase(draftItem({ status: "draft" }));
    deleteWhere.mockResolvedValue([{ affectedRows: 0 }]);

    await expect(rejectMarketingContent({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("already removed or has changed");
    expect(db.delete).toHaveBeenCalledTimes(1);
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

  it("fails closed when the final caption plus risk notice exceeds 500 characters", async () => {
    const { updateSet } = mockDatabase(draftItem({ caption: "x".repeat(480), riskNotice: "Automated trading carries risk." }));

    await expect(approveMarketingContent({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("1–500 characters");
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "publish_pending" }));
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "publish_failed", publishErrorCode: "INVALID_TEXT" }));
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
    expect(insertValues.mock.calls[0][0].caption).toContain("https://ea.fizuxc0der.uk/");
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
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ title: "Nak automate MT5 dengan lebih teratur?", language: "en_ms", destinationUrl: "https://ea.fizuxc0der.uk/", status: "draft", complianceStatus: "passed" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, action: "revised", note: "Gemini Bot EA 20-day campaign created" }));
  });

  it("creates five additional rojak drafts as unapproved records without duplicates", async () => {
    const { insertValues } = mockMissingDatabase();

    await expect(applyGeminiBotThreadsAdditions(1)).resolves.toEqual({ created: 5, current: 0, skipped: 0 });
    expect(GEMINI_BOT_THREADS_ADDITIONS).toHaveLength(5);
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ language: "en_ms", destinationUrl: "https://ea.fizuxc0der.uk/", status: "draft", complianceStatus: "passed" }));
    for (const draft of GEMINI_BOT_THREADS_ADDITIONS) {
      expect(draft.caption).toMatch(/Gemini Bot EA/i);
      expect(draft.caption).toContain("https://ea.fizuxc0der.uk/");
      expect(draft.caption.length).toBeLessThanOrEqual(500);
      expect(draft.caption.match(/#[A-Za-z0-9_]+/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(draft.caption.match(/#[A-Za-z0-9_]+/g)?.length ?? 0).toBeLessThanOrEqual(5);
    }
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
    expect(captions).toContain("nak explore");
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
