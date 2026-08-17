import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

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
  });
}

describe("getSecureFileForCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only a file attached to an active unexpired test entitlement", async () => {
    const file = { id: 77, productId: "test-gemini-bot-ea", fileName: "FizuxCoder_Test_Licence_Receipt.txt", storageKey: "protected/test.txt" };
    mockDownloadRecord({ file, entitlement: { status: "active", expiresAt: new Date(Date.now() + 60_000) } });

    await expect(getSecureFileForCustomer({ userId: 42, fileId: 77 })).resolves.toEqual(file);
  });

  it("rejects a test download after the test entitlement expires", async () => {
    mockDownloadRecord({ file: { id: 77 }, entitlement: { status: "active", expiresAt: new Date(Date.now() - 60_000) } });

    await expect(getSecureFileForCustomer({ userId: 42, fileId: 77 })).rejects.toThrow("No active entitlement for this download");
  });

  it("rejects a download when no entitlement record exists", async () => {
    mockDownloadRecord(null);

    await expect(getSecureFileForCustomer({ userId: 42, fileId: 77 })).rejects.toThrow("No active entitlement for this download");
  });
});
