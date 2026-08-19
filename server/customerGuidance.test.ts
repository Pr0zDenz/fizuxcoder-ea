import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const portalPath = path.join(projectRoot, "client", "src", "pages", "Portal.tsx");
const guidancePath = path.join(projectRoot, "docs", "CUSTOMER_POST_PAYMENT_AND_EA_SETUP.md");
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
});
