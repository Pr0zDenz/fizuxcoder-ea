import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = "/home/ubuntu/fizuxcoder-ea-brochure";
const releases = path.join(root, "docs/release-records/mql5");
const forbidden = /Telegram|Marketing|Screenshot|Mock|Admin|Event_Ingest|THREADS|GEMINI_EVENT|TakeTradeScreenshots|EnableAutoScreenshots|PingGeminiEventPortal|TelegramState|telegram_/i;

describe("customer VIP EA releases", () => {
  it("keeps required VIP source and package files", () => {
    for (const file of [
      "GeminiBotEAv11.97_VIP.mq5",
      "3SUniversalEA_customer_license_VIP.mq5",
      "GeminiBotEAv11.97_VIP_package.zip",
      "3SUniversalEA_customer_license_VIP_package.zip",
    ]) expect(existsSync(path.join(releases, file))).toBe(true);
  });

  it("contains no internal reporting or marketing hooks", () => {
    for (const file of ["GeminiBotEAv11.97_VIP.mq5", "3SUniversalEA_customer_license_VIP.mq5"]) {
      const source = readFileSync(path.join(releases, file), "utf8");
      expect(source).not.toMatch(forbidden);
      expect(source).toMatch(/license|account|expiry|expire/i);
      expect(source).toMatch(/CTrade|Position|OrderSend|Safe|TP|SL|Fibo/i);
    }
  });

  it("uses VIP display names in the dedicated importer", () => {
    const importer = readFileSync(path.join(root, "scripts/import-vip-ea-packages.mjs"), "utf8");
    expect(importer).toContain("Gemini Bot EA v11.97_VIP");
    expect(importer).toContain("3S Universal EA_VIP");
    expect(importer).toContain('contentType: "application/zip"');
  });
});
