import { describe, expect, it } from "vitest";

const appId = process.env.THREADS_APP_ID;
const appSecret = process.env.THREADS_APP_SECRET;
const shouldRun = process.env.RUN_LIVE_THREADS_CREDENTIAL_TESTS === "1";

describe("Threads app credentials (opt-in live check)", () => {
  it.skipIf(!shouldRun || !appId || !appSecret)("accept the configured Meta app access token without exposing credentials", async () => {
    const appAccessToken = `${appId}|${appSecret}`;
    const url = new URL("https://graph.facebook.com/debug_token");
    url.searchParams.set("input_token", appAccessToken);
    url.searchParams.set("access_token", appAccessToken);

    const response = await fetch(url);
    const payload = await response.json() as { data?: { app_id?: string; is_valid?: boolean } };

    expect(response.ok).toBe(true);
    expect(payload.data?.is_valid).toBe(true);
    expect(payload.data?.app_id).toBe(appId);
  });
});
