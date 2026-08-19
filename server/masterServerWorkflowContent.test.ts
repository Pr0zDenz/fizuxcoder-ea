import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("3S Master Server activation guidance", () => {
  it("describes the supplied one-time activation contract without exposing a Master Server key", () => {
    const home = readFileSync(resolve(projectRoot, "client", "src", "pages", "Home.tsx"), "utf8");

    expect(home).toContain("3SUniversalEA_customer_license.ex5");
    expect(home).toContain("one-time activation code");
    expect(home).toContain("License ID");
    expect(home).toContain("WebRequest permissions");
    expect(home).toContain("Never enter or share a Master Server key");
    expect(home).toContain("MLN prediction and feedback requests");
    expect(home).toContain("complete 3S replacement package is in validation");
  });
});
