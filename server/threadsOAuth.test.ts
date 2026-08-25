import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decryptThreadsAccessToken, encryptThreadsAccessToken, THREADS_DATA_DELETION_URL, THREADS_DEAUTHORIZE_URL, THREADS_REDIRECT_URI } from "./threadsOAuth";

const sourcePath = resolve(import.meta.dirname, "threadsOAuth.ts");

describe("Threads OAuth security boundary", () => {
  it("encrypts authorization tokens before persistence and restores them only server-side", () => {
    const token = "threads-owner-token-for-test-only";
    const encrypted = encryptThreadsAccessToken(token);

    expect(encrypted).not.toContain(token);
    expect(decryptThreadsAccessToken(encrypted)).toBe(token);
  });

  it("uses fixed production callback, deauthorization, and data-deletion URLs", () => {
    expect(THREADS_REDIRECT_URI).toBe("https://fizuxea-jxctlods.manus.space/api/threads/oauth/callback");
    expect(THREADS_DEAUTHORIZE_URL).toBe("https://fizuxea-jxctlods.manus.space/api/threads/deauthorize");
    expect(THREADS_DATA_DELETION_URL).toBe("https://fizuxea-jxctlods.manus.space/api/threads/data-deletion");
  });

  it("requests only identity and content-publish scopes while exposing no publishing endpoint", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain('const THREADS_SCOPES = "threads_basic,threads_content_publish";');
    expect(source).toContain('app.get("/api/threads/oauth/start"');
    expect(source).toContain('app.post("/api/threads/deauthorize"');
    expect(source).toContain('app.post("/api/threads/data-deletion"');
    expect(source).not.toContain('threads.com/v1.0/{threads-user-id}/threads');
  });

  it("keeps encrypted access tokens out of the connection-status projection", () => {
    const source = readFileSync(sourcePath, "utf8");
    const statusBody = source.slice(source.indexOf("export async function getThreadsConnectionStatus"), source.indexOf("export function registerThreadsOAuthRoutes"));

    expect(statusBody).not.toContain("encryptedAccessToken:");
    expect(statusBody).not.toContain("accessToken:");
    expect(statusBody).toContain("username: threadsAuthorizations.username");
  });
});
