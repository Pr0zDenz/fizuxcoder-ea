import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function customerContext(): TrpcContext {
  return {
    user: {
      id: 401,
      openId: "customer-boundary-test",
      email: "customer@example.test",
      name: "Customer Boundary Test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("administrator-only portal procedures", () => {
  it("rejects a customer session before test-product data or actions can be reached", async () => {
    const caller = appRouter.createCaller(customerContext());

    await expect(caller.test.catalog()).rejects.toThrow("You do not have required permission");
    await expect(caller.test.simulateNoChargePurchase()).rejects.toThrow("You do not have required permission");
  });

  it("rejects a customer session before protected release-upload handling can begin", async () => {
    const caller = appRouter.createCaller(customerContext());

    await expect(caller.admin.uploadPackage({
      productId: "gemini-bot-ea",
      displayName: "Blocked customer upload",
      fileName: "blocked.ex5",
      base64: "YmxvY2tlZA==",
    })).rejects.toThrow("You do not have required permission");
  });
});
