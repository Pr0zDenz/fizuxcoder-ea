import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const homePath = path.resolve(process.cwd(), "client/src/pages/Home.tsx");
const evidencePath = path.resolve(process.cwd(), "docs/PERFORMANCE_EVIDENCE_AUGUST_2026.md");

describe("historical performance evidence content", () => {
  it("labels the performance material as owner-supplied historical evidence and shows loss context", () => {
    const source = fs.readFileSync(homePath, "utf8");

    expect(source).toContain('id="performance"');
    expect(source).toContain("Owner-stated sample window:");
    expect(source).toContain("not independently audited");
    expect(source).toContain("Maximum drawdown");
    expect(source).toContain("11.5%");
    expect(source).toContain("Reported gross loss");
    expect(source).toContain("−1,216.78");
    expect(source).toContain("do not predict future results");
  });

  it("explains the EA as a configured execution workflow without a profit promise", () => {
    const source = fs.readFileSync(homePath, "utf8");

    expect(source).toContain("Rules first. Market outcome second.");
    expect(source).toContain("does not create profit with certainty");
    expect(source).toContain("market movement, broker execution, and costs");
    expect(source).not.toContain("profit without hesitation");
  });

  it("documents screenshot boundaries before figures are used in customer-facing copy", () => {
    const evidence = fs.readFileSync(evidencePath, "utf8");

    expect(evidence).toContain("not independently audited or verified");
    expect(evidence).toContain("24–25 August 2026");
    expect(evidence).toContain("does **not** prove");
    expect(evidence).toContain("Maximum drawdown");
  });
});
