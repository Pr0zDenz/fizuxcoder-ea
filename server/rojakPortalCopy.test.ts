import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const homePath = fileURLToPath(new URL("../client/src/pages/Home.tsx", import.meta.url));

describe("public portal copy alignment", () => {
  it("uses rojak discovery and CTA language without turning evidence into a promise", async () => {
    const source = await readFile(homePath, "utf8");
    expect(source).toContain("Still watching charts all day?");
    expect(source).toContain("Bukan magic button");
    expect(source).toContain("Curious nak explore?");
    expect(source).toContain("look at the full picture");
    expect(source).toContain("historical examples do not predict future results");
    expect(source).toContain("Ready nak explore?");
    expect(source).not.toMatch(/guaranteed profit|passive income|risk-free|prints money/i);
  });
});
