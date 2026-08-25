import { describe, expect, it } from "vitest";
import { currentAuditCycleKey, getConfiguredMasterServerBaseUrl, PROTECTED_DELIVERY_AUDIT_CRON, PROTECTED_DELIVERY_AUDIT_PATH, PROTECTED_DELIVERY_AUDIT_SCHEDULE_NAME } from "./protectedDeliveryAudit";

 describe("protected delivery monthly audit", () => {
  it("uses a UTC calendar-month key for fresh monthly cycles", () => {
    expect(currentAuditCycleKey(new Date("2026-08-01T00:00:00.000Z"))).toBe("2026-08");
    expect(currentAuditCycleKey(new Date("2026-08-31T23:59:59.999Z"))).toBe("2026-08");
    expect(currentAuditCycleKey(new Date("2026-09-01T00:00:00.000Z"))).toBe("2026-09");
  });

  it("uses the project schedule contract and supplied HTTPS endpoint", () => {
    expect(PROTECTED_DELIVERY_AUDIT_SCHEDULE_NAME).toBe("protected-delivery-audit-monthly");
    expect(PROTECTED_DELIVERY_AUDIT_PATH).toBe("/api/scheduled/protected-delivery-audit");
    expect(PROTECTED_DELIVERY_AUDIT_CRON).toBe("0 0 1 1 * *");
    expect(getConfiguredMasterServerBaseUrl()).toBe("https://ruby-railroad-trimester.ngrok-free.dev");
  });

  it("keeps the scheduled audit read-only at the Master Server boundary", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./protectedDeliveryAudit.ts", import.meta.url), "utf8"));
    expect(source).toContain('method: "GET"');
    expect(source).not.toContain("/license/bind");
    expect(source).not.toContain("sync-test-entitlement");
    expect(source).toContain("status: \"skipped\"");
  });
});
