import { describe, expect, it } from "vitest";

process.env.JWT_SECRET ??= "gmail-oauth-test-secret";

describe("Gmail authorization token protection", () => {
  it("encrypts refresh tokens at rest and recovers them only with the server key", async () => {
    const { decryptGmailRefreshToken, encryptGmailRefreshToken } = await import("./gmailOAuth");
    const refreshToken = "1//test-refresh-token-value";
    const encrypted = encryptGmailRefreshToken(refreshToken);

    expect(encrypted).not.toContain(refreshToken);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(decryptGmailRefreshToken(encrypted)).toBe(refreshToken);
  });
});
