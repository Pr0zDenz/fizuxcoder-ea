import { beforeEach, describe, expect, it, vi } from "vitest";
import { entitlements, paymentOrders, productFiles, products } from "../drizzle/schema";

const { getDbMock, bindMasterMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), bindMasterMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./masterServer", () => ({ bindMasterServerLicence: bindMasterMock }));

import { bindCustomerMt5Account, getCustomerLibrary, getSecureFileForCustomer, recordPaymentCallback } from "./paymentPortal";

type MockState = {
  order: Record<string, unknown>;
  product: Record<string, unknown>;
  entitlement: Record<string, unknown> | null;
  file: Record<string, unknown>;
};

function queryResult<T>(rows: T[]) {
  const promise = Promise.resolve(rows) as Promise<T[]> & { limit: (count: number) => Promise<T[]> };
  promise.limit = async (count: number) => rows.slice(0, count);
  return promise;
}

function createMockDb(state: MockState) {
  return {
    select: (shape?: Record<string, unknown>) => ({
      from: (table: unknown) => {
        if (table === paymentOrders) return { where: () => queryResult([state.order]) };
        if (table === products) return { where: () => queryResult([state.product]) };
        if (table === productFiles) {
          if (shape && "file" in shape) return { innerJoin: () => ({ where: () => queryResult(state.entitlement ? [{ file: state.file, entitlement: state.entitlement }] : []) }) };
          return { where: () => queryResult([state.file]) };
        }
        if (table === entitlements) {
          return {
            innerJoin: () => ({ where: () => queryResult(state.entitlement ? [{ entitlement: state.entitlement, product: state.product }] : []) }),
          };
        }
        return { where: () => queryResult([]) };
      },
    }),
    update: (table: unknown) => ({
      set: (changes: Record<string, unknown>) => ({
        where: async () => {
          if (table === paymentOrders) Object.assign(state.order, changes);
          if (table === entitlements && state.entitlement) Object.assign(state.entitlement, changes);
        },
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        if (table === entitlements) state.entitlement = { id: 91, mt5AccountNumber: null, mt5BoundAt: null, ...values };
        return {
          onDuplicateKeyUpdate: async ({ set }: { set: Record<string, unknown> }) => {
            if (state.entitlement) Object.assign(state.entitlement, set);
          },
        };
      },
    }),
  };
}

describe("isolated RM1 portal workflow mock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("settles only the test product, exposes its test file, and records MT5 replacement without production access", async () => {
    const state: MockState = {
      order: {
        id: "order-test-1", userId: 42, productId: "test-gemini-bot-ea", externalReference: "FZTEST-MOCK-1",
        providerBillCode: "mock-bill", expectedAmountSen: 100, status: "pending",
      },
      product: { id: "test-gemini-bot-ea", name: "Gemini Bot EA — RM1 Live Test", priceSen: 100, billingCycle: "one-time", isTest: "yes", active: "yes" },
      entitlement: null,
      file: { id: 77, productId: "test-gemini-bot-ea", fileName: "FizuxCoder_Test_Licence_Receipt.txt", storageKey: "protected-test/receipt.txt" },
    };
    getDbMock.mockResolvedValue(createMockDb(state));
    const previousAccounts: string[] = [];
    bindMasterMock.mockImplementation(async ({ accountNumber }: { accountNumber: string }) => {
      const replaced = previousAccounts.at(-1);
      previousAccounts.push(accountNumber);
      return { account_number: accountNumber, replaced_account: replaced, expiry: "2099-01-01" };
    });

    await expect(recordPaymentCallback({ externalReference: "FZTEST-MOCK-1", billCode: "mock-bill", refNo: "invoice-mock-1", status: "1", amountSen: 100 })).resolves.toEqual({ accepted: true });
    expect(state.entitlement).toMatchObject({ userId: 42, productId: "test-gemini-bot-ea", status: "active" });

    const library = await getCustomerLibrary(42);
    expect(library).toHaveLength(1);
    expect(library[0]).toMatchObject({ productId: "test-gemini-bot-ea", status: "active", files: [{ id: 77, fileName: "FizuxCoder_Test_Licence_Receipt.txt" }] });

    await expect(bindCustomerMt5Account({ userId: 42, userEmail: "mock-buyer@example.test", productId: "test-gemini-bot-ea", accountNumber: "990001" })).resolves.toMatchObject({ accountNumber: "990001", replacedAccount: null });
    await expect(bindCustomerMt5Account({ userId: 42, userEmail: "mock-buyer@example.test", productId: "test-gemini-bot-ea", accountNumber: "990002" })).resolves.toMatchObject({ accountNumber: "990002", replacedAccount: "990001" });

    await expect(getSecureFileForCustomer({ userId: 42, fileId: 77 })).resolves.toMatchObject({ productId: "test-gemini-bot-ea", fileName: "FizuxCoder_Test_Licence_Receipt.txt" });
    expect(state.entitlement?.productId).toBe("test-gemini-bot-ea");
    expect(state.entitlement?.mt5AccountNumber).toBe("990002");
  });
});
