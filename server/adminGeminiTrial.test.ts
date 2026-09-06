import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const serviceSource = await readFile(new URL("./adminGeminiTrial.ts", import.meta.url), "utf8");
const routerSource = await readFile(new URL("./routers.ts", import.meta.url), "utf8");

describe("Gemini Bot admin trial", () => {
  it("is limited to the approved seven-day production Gemini trial", () => {
    expect(serviceSource).toContain('input.durationDays !== 7');
    expect(serviceSource).toContain('const GEMINI_PRODUCT_ID = "gemini-bot-ea"');
    expect(serviceSource).toContain('source: "admin_trial"');
    expect(serviceSource).toContain('isAdminTrial: "yes"');
    expect(serviceSource).toContain("no ToyyibPay request or settlement occurred");
    expect(serviceSource).toContain('status: "revoked"');
  });

  it("is exposed only through adminProcedure with numeric account validation", () => {
    expect(routerSource).toContain("grantGeminiAdminTrial: adminProcedure");
    expect(routerSource).toContain('durationDays: z.literal(7)');
    expect(routerSource).toContain("accountNumber: z.string().regex(/^\\d{1,20}$/");
  });
});
