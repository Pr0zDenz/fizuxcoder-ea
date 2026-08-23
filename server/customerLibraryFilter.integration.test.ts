import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { getCustomerLibrary } from "./paymentPortal";

describe("getCustomerLibrary test-product isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not return a test entitlement even if an adapter returns it with production rows", async () => {
    const now = new Date();
    const rows = [
      {
        entitlement: { id: 1, status: "active", expiresAt: new Date(now.getTime() + 60_000), mt5AccountNumber: null, mt5BoundAt: null },
        product: { id: "test-gemini-bot-ea", name: "Gemini Bot EA — RM1 Live Test", billingCycle: "one_time", isTest: "yes" as const },
      },
      {
        entitlement: { id: 2, status: "active", expiresAt: null, mt5AccountNumber: "123456", mt5BoundAt: now },
        product: { id: "gemini-bot-ea", name: "Gemini Bot EA", billingCycle: "monthly", isTest: "no" as const },
      },
    ];
    let selectCall = 0;
    getDbMock.mockResolvedValue({
      select: () => {
        selectCall += 1;
        if (selectCall === 1) {
          return { from: () => ({ innerJoin: () => ({ where: async () => rows }) }) };
        }
        return { from: () => ({ where: async () => [] }) };
      },
      update: () => ({ set: () => ({ where: vi.fn() }) }),
    });

    await expect(getCustomerLibrary(42)).resolves.toEqual([
      expect.objectContaining({ productId: "gemini-bot-ea", productName: "Gemini Bot EA", status: "active", files: [] }),
    ]);
  });
});
