import { describe, expect, it } from "vitest";
import { summarizeAdminCommandCenter } from "./adminCommandCenter";

describe("Admin Command Center summary", () => {
  it("reports operational counts and keeps Telegram disabled before credentials are configured", () => {
    const snapshot = summarizeAdminCommandCenter({
      products: [{ id: "gemini", active: "yes", isTest: "no" }, { id: "test", active: "yes", isTest: "yes" }],
      entitlements: [{ status: "active", mt5AccountNumber: "230069105" }, { status: "expired", mt5AccountNumber: null }],
      orders: [{ status: "paid" }, { status: "pending" }],
      downloads: [{ deliveredAt: new Date("2026-08-27T00:00:00Z") }],
      emails: [{ status: "sent" }, { status: "failed" }],
      marketingCounts: [{ status: "draft", count: 1 }],
      recentMarketing: [{ id: 1, title: "Setup evidence", status: "draft", createdAt: new Date("2026-08-27T00:00:00Z") }],
      auditCycles: [{ status: "completed", masterServerReachable: "yes", masterServerHttpStatus: 200, startedAt: new Date("2026-08-27T00:00:00Z"), completedAt: new Date("2026-08-27T00:01:00Z"), failureReason: null }],
    });

    expect(snapshot.entitlements).toMatchObject({ active: 1, boundMt5: 1, expired: 1 });
    expect(snapshot.marketing).toMatchObject({ draft: 1, posted: 0 });
    expect(snapshot.masterServer).toMatchObject({ reachable: true, httpStatus: 200 });
    expect(snapshot.telegram).toMatchObject({ state: "not_configured", automaticDeliveryEnabled: false });
  });
});
