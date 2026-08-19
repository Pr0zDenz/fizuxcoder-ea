import { describe, expect, it } from "vitest";

const tokenEndpoint = "https://oauth2.googleapis.com/token";

describe("Gmail OAuth production credentials", () => {
  it("accepts the configured client credentials and rejects only the disposable authorization code", async () => {
    const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
    const senderEmail = process.env.GMAIL_SENDER_EMAIL;

    expect(clientId, "GMAIL_OAUTH_CLIENT_ID must be configured").toBeTruthy();
    expect(clientSecret, "GMAIL_OAUTH_CLIENT_SECRET must be configured").toBeTruthy();
    expect(senderEmail, "GMAIL_SENDER_EMAIL must be configured").toBe("xtr0zen@gmail.com");

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: "fizuxcoder-client-credential-canary",
        grant_type: "authorization_code",
        redirect_uri: "https://fizuxea-jxctlods.manus.space/api/gmail/oauth/callback",
      }),
    });

    const payload = (await response.json()) as { error?: string };

    // A valid OAuth client reaches authorization-code validation and returns
    // invalid_grant for this deliberately disposable code. Invalid credentials
    // instead return invalid_client, which fails this test without exposing
    // either secret value in test output.
    expect(payload.error).toBe("invalid_grant");
  }, 20_000);
});
