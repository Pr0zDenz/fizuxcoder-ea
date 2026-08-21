import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publisherPath = path.join(projectRoot, "scripts", "publishValidatedCustomerReleases.mjs");
const verifierPath = path.join(projectRoot, "scripts", "verifyPublishedReleaseObjects.mjs");

describe("validated protected-release publisher", () => {
  it("requires an explicit commit flag and verifies the supplied ZIP hashes before it can replace library records", () => {
    const source = readFileSync(publisherPath, "utf8");

    expect(source).toContain('process.env.COMMIT_RELEASE === "true"');
    expect(source).toContain("SHA-256 does not match the validated release manifest");
    expect(source).toContain("protected-library inventory changed after the rollback snapshot");
    expect(source).toContain("legacy files are referenced by delivery audits");
  });

  it("publishes one ZIP package and one product-specific customer guide for each entitlement", () => {
    const source = readFileSync(publisherPath, "utf8");

    expect(source).toContain('productId: "gemini-bot-ea"');
    expect(source).toContain('productId: "3s-universal-ea"');
    expect(source).toContain("GeminiBotEA-MQL5-v11.97.zip");
    expect(source).toContain("3SUniversalEA-MQL5-customer-license.zip");
    expect(source).toContain("README_Gemini_Bot_EA_v11.97.md");
    expect(source).toContain("README_3S_Universal_EA.md");
  });

  it("verifies stored release bytes through privileged storage without creating a customer entitlement", () => {
    const source = readFileSync(verifierPath, "utf8");

    expect(source).toContain("storageGetSignedUrl");
    expect(source).toContain("Stored byte mismatch");
    expect(source).not.toContain("entitlements");
    expect(source).not.toContain("protectedDeliveryAudits");
  });
});
