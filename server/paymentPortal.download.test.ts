import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock, auditInsertMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), auditInsertMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { getSecureFileForCustomer } from "./paymentPortal";

function mockDownloadRecord(record: unknown) {
  getDbMock.mockResolvedValue({
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: async () => (record ? [record] : []),
          }),
        }),
      }),
    }),
    insert: () => ({ values: auditInsertMock }),
  });
}

describe("getSecureFileForCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditInsertMock.mockResolvedValue(undefined);
  });

  it("returns only a file attached to an active unexpired test entitlement", async () => {
    const file = { id: 77, productId: "test-gemini-bot-ea", fileName: "FizuxCoder_Test_Licence_Receipt.txt", storageKey: "protected/test.txt" };
    mockDownloadRecord({ file, entitlement: { id: 9, status: "active", expiresAt: new Date(Date.now() + 60_000) } });

    await expect(getSecureFileForCustomer({ userId: 42, fileId: 77 })).resolves.toEqual(file);
    expect(auditInsertMock).toHaveBeenCalledWith({ userId: 42, productId: "test-gemini-bot-ea", fileId: 77, entitlementId: 9 });
  });

  it("rejects a test download after the test entitlement expires", async () => {
    mockDownloadRecord({ file: { id: 77 }, entitlement: { status: "active", expiresAt: new Date(Date.now() - 60_000) } });

    await expect(getSecureFileForCustomer({ userId: 42, fileId: 77 })).rejects.toThrow("No active entitlement for this download");
    expect(auditInsertMock).not.toHaveBeenCalled();
  });

  it("rejects a download when no entitlement record exists", async () => {
    mockDownloadRecord(null);

    await expect(getSecureFileForCustomer({ userId: 42, fileId: 77 })).rejects.toThrow("No active entitlement for this download");
    expect(auditInsertMock).not.toHaveBeenCalled();
  });
});
