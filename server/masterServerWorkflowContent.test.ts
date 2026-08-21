import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("3S Master Server activation guidance", () => {
  it("describes the supplied one-time activation contract without exposing a Master Server key", () => {
    const home = readFileSync(resolve(projectRoot, "client", "src", "pages", "Home.tsx"), "utf8");
    const portal = readFileSync(resolve(projectRoot, "client", "src", "pages", "Portal.tsx"), "utf8");

    expect(home).toContain("3SUniversalEA_customer_license.ex5");
    expect(home).toContain("one-time activation code");
    expect(home).toContain("License ID");
    expect(home).toContain("WebRequest permissions");
    expect(home).toContain("Never enter or share a Master Server key");
    expect(home).toContain("MLN prediction and feedback requests");
    expect(home).toContain("Payment-confirmation e-mails are sent separately by the FizuxCoder portal");
    expect(home).toContain("Gmail only delivers the post-payment portal notice");
    expect(home).toContain("complete 3S replacement package is in validation");
    expect(portal).toContain("one-time activation details are sent to your registered email");
    expect(portal).toContain("For 3S account replacement, contact support first");
  });

  it("documents the removed legacy test-entitlement probe instead of treating it as a production capability", () => {
    const reconciliation = readFileSync(resolve(projectRoot, "docs", "MASTER_SERVER_LEGACY_PROBE_RECONCILIATION_2026-08-22.md"), "utf8");

    expect(reconciliation).toContain("`POST /license/sync-test-entitlement`");
    expect(reconciliation).toContain("404");
    expect(reconciliation).toContain("does not depend on it");
    expect(reconciliation).toContain("Do not restore or call a test-entitlement route in production");
  });
});
