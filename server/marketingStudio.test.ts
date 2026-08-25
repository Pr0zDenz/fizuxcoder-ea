import { describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { TWO_WEEK_THREADS_PILOT, approveMarketingContent, markMarketingContentPosted } from "./marketingStudio";

function draftItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    status: "draft",
    complianceStatus: "passed",
    contentHash: "a".repeat(64),
    ...overrides,
  };
}

function mockDatabase(item: Record<string, unknown>) {
  const selectLimit = vi.fn().mockResolvedValue([item]);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const db = {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  getDbMock.mockResolvedValue(db);
  return { db, updateSet, insertValues };
}

describe("private marketing studio safeguards", () => {
  it("does not allow an unapproved draft to be marked as manually posted", async () => {
    const { updateSet } = mockDatabase(draftItem({ status: "draft" }));

    await expect(markMarketingContentPosted({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("Only an approved draft may be marked as manually posted");
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("does not approve a draft until its compliance review has passed", async () => {
    const { updateSet } = mockDatabase(draftItem({ complianceStatus: "pending" }));

    await expect(approveMarketingContent({ contentItemId: 9, actorUserId: 1 })).rejects.toThrow("Resolve compliance review before approving this draft");
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("writes an approval update and audit only for a compliant draft", async () => {
    const { updateSet, insertValues } = mockDatabase(draftItem({ status: "draft", complianceStatus: "passed" }));

    await expect(approveMarketingContent({ contentItemId: 9, actorUserId: 1 })).resolves.toEqual({ success: true });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", approvedByUserId: 1 }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ contentItemId: 9, actorUserId: 1, action: "approved" }));
  });

  it("keeps the seeded pilot educational and free of return promises", () => {
    expect(TWO_WEEK_THREADS_PILOT).toHaveLength(10);
    const allCaptions = TWO_WEEK_THREADS_PILOT.map(item => item.caption.toLowerCase()).join(" ");
    expect(allCaptions).not.toMatch(/guaranteed returns?|risk-free automation|passive income|\bwin rate\b|guaranteed profit/);
  });
});
