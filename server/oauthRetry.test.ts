import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getOAuthRetryRedirect } from "./_core/oauth";

const oauthSource = readFileSync(resolve(import.meta.dirname, "_core", "oauth.ts"), "utf8");
const portalSource = readFileSync(resolve(import.meta.dirname, "..", "client", "src", "pages", "Portal.tsx"), "utf8");

describe("OAuth callback recovery", () => {
  it("redirects temporary upstream exchange outages to a fixed portal retry page", () => {
    expect(getOAuthRetryRedirect({ response: { status: 503 } })).toBe("/portal?signIn=service_unavailable");
    expect(getOAuthRetryRedirect({ response: { status: 502 } })).toBe("/portal?signIn=service_unavailable");
    expect(getOAuthRetryRedirect({ response: { status: 504 } })).toBe("/portal?signIn=service_unavailable");
  });

  it("does not reflect unexpected OAuth errors to the browser", () => {
    expect(getOAuthRetryRedirect(new Error("internal OAuth provider detail"))).toBe("/portal?signIn=failed");
    expect(getOAuthRetryRedirect({ response: { status: 400 } })).toBe("/portal?signIn=failed");
  });

  it("keeps the nonce guard and a fixed successful destination intact", () => {
    expect(oauthSource).toContain("if (!nonce || nonce !== expectedNonce)");
    expect(oauthSource).toContain('res.status(403).json({ error: "invalid oauth state" });');
    expect(oauthSource).toContain('res.redirect(302, "/");');
    expect(oauthSource).toContain("res.redirect(302, getOAuthRetryRedirect(error));");
  });

  it("renders a customer-readable retry action for the fixed recovery route", () => {
    expect(portalSource).toContain('get("signIn")');
    expect(portalSource).toContain('signInStatus === "service_unavailable"');
    expect(portalSource).toContain("Try sign-in again");
    expect(portalSource).toContain("Your payment, library, and account access have not changed.");
  });
});
