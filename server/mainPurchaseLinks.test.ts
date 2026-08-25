import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homePath = resolve(import.meta.dirname, "..", "client", "src", "pages", "Home.tsx");

describe("main-page product purchase routes", () => {
  it("provides distinct verified direct ToyyibPay links for Gemini and 3S", () => {
    const home = readFileSync(homePath, "utf8");

    expect(home).toContain('const geminiPurchaseUrl = "https://toyyibpay.com/t1rvxbft";');
    expect(home).toContain('const threeSPurchaseUrl = "https://toyyibpay.com/3-Serangkai-EA";');
    expect(home).toContain('href={activeProduct === "gemini" ? geminiPurchaseUrl : threeSPurchaseUrl}');
    expect(home).toContain('href={threeSPurchaseUrl}');
    expect(home).toContain('href={geminiPurchaseUrl}');
  });

  it("keeps the 3S lifetime-download and one-year API-licence distinction visible", () => {
    const home = readFileSync(homePath, "utf8");

    expect(home).toContain("Lifetime package-download entitlement");
    expect(home).toContain("Master Server API licence is issued for one year");
  });
});
