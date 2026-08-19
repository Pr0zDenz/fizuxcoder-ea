import { describe, expect, it } from "vitest";

const shouldRun = process.env.RUN_LIVE_RESEND_TEST === "1";

describe("Resend credentials", () => {
  it.skipIf(!shouldRun)("authenticates against the Resend domains endpoint without sending mail", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeTruthy();
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as { data?: unknown[] };
    expect(Array.isArray(payload.data)).toBe(true);
  }, 15_000);
});
