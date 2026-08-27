import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const portalPath = path.join(projectRoot, "client", "src", "pages", "Portal.tsx");
const guidancePath = path.join(projectRoot, "docs", "CUSTOMER_POST_PAYMENT_AND_EA_SETUP.md");
const reconciliationPath = path.join(projectRoot, "docs", "CHECKLIST_RECONCILIATION_2026-08-19.md");
const publishedGuideUrl = "https://fizuxea-jxctlods.manus.space/portal#installation-guide";

describe("published customer installation guidance", () => {
  it("keeps buyer and update templates pointed at a visible portal guide destination", () => {
    const portalSource = readFileSync(portalPath, "utf8");
    const guidance = readFileSync(guidancePath, "utf8");

    expect(portalSource).toContain('id="installation-guide"');
    expect(portalSource).toContain('href="#installation-guide"');
    expect(guidance).toContain("Buyer e-mail template: Gemini Bot EA v11.97 purchase");
    expect(guidance).toContain("Buyer e-mail template: 3 Serangkai UNIVERSAL EA v13.85 purchase");
    expect(guidance.match(new RegExp(publishedGuideUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps deferred operating checks documented instead of presenting them as live automation", () => {
    const reconciliation = readFileSync(reconciliationPath, "utf8");

    expect(reconciliation).toContain("## On-demand operating runbook");
    expect(reconciliation).toContain("Owner-only release desk");
    expect(reconciliation).toContain("ngrok restart");
    expect(reconciliation).toContain("Entitlement visibility before MT5 binding");
    expect(reconciliation).toContain("not** an asserted production capability");
  });

  it("provides separate customer installation guides for the confirmed 3S one-time activation and Gemini account-binding flows", () => {
    const threeS = readFileSync(path.join(projectRoot, "docs", "3S_UNIVERSAL_CUSTOMER_README.md"), "utf8");
    const gemini = readFileSync(path.join(projectRoot, "docs", "GEMINI_BOT_CUSTOMER_README.md"), "utf8");

    expect(threeS).toContain("3SUniversalEA_customer_license.ex5");
    expect(threeS).toContain("https://signal.fizuxc0der.uk");
    expect(threeS).toContain("one-year API licence");
    expect(threeS).toContain("one-time activation code");
    expect(threeS).toContain("lifetime product entitlement");
    expect(gemini).toContain("GeminiBotEAv11.97.ex5");
    expect(gemini).toContain("FizuxCoder_News_Calendar_v5.00_Tradays.ex5");
    expect(gemini).toContain("/config");
    expect(gemini).toContain("https://signal.fizuxc0der.uk");
    expect(gemini).toContain("monthly entitlement");
  });
});
