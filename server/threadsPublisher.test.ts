import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./threadsOAuth", () => ({
  getThreadsAuthorizationForPublishing: vi.fn(),
}));

import { getThreadsAuthorizationForPublishing } from "./threadsOAuth";
import { publishThreadsPost } from "./threadsPublisher";

const authorization = {
  ownerUserId: 1,
  threadsUserId: "17841400000000000",
  username: "hafizhassan.45",
  displayName: "Fizu Hassan",
  encryptedAccessToken: "encrypted-only",
  accessToken: "server-secret-token",
  grantedScopes: "threads_basic,threads_content_publish",
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  authorizedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  updatedAt: new Date(),
};

describe("Threads automatic publisher", () => {
  beforeEach(() => {
    vi.mocked(getThreadsAuthorizationForPublishing).mockResolvedValue(authorization);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "container-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "post-1" }), { status: 200 })));
  });

  it("publishes an image-backed approved item through container then publish", async () => {
    const result = await publishThreadsPost({ ownerUserId: 1, text: "Gemini Bot EA\n\nAutomated trading carries risk.", assetUrl: "/manus-storage/gemini-checklist.png", waitMs: 0 });
    const calls = vi.mocked(fetch).mock.calls;
    expect(result).toEqual({ externalPostId: "post-1", hasImage: true });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]).toBe("https://graph.threads.com/v1.0/17841400000000000/threads");
    expect((calls[0]?.[1]?.body as URLSearchParams).get("media_type")).toBe("IMAGE");
    expect((calls[0]?.[1]?.body as URLSearchParams).get("image_url")).toBe("https://fizuxea-jxctlods.manus.space/manus-storage/gemini-checklist.png");
    expect((calls[1]?.[0])).toBe("https://graph.threads.com/v1.0/17841400000000000/threads_publish");
    expect((calls[1]?.[1]?.body as URLSearchParams).get("creation_id")).toBe("container-1");
  });

  it("keeps text-only approved items text-only", async () => {
    const result = await publishThreadsPost({ ownerUserId: 1, text: "Text-only Gemini Bot EA note", assetUrl: null, waitMs: 0 });
    const body = vi.mocked(fetch).mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(result.hasImage).toBe(false);
    expect(body.get("media_type")).toBe("TEXT");
    expect(body.get("image_url")).toBeNull();
  });

  it("rejects oversized text before contacting Threads", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(publishThreadsPost({ ownerUserId: 1, text: "x".repeat(501), waitMs: 0 })).rejects.toThrow("1–500 characters");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("sanitizes provider failures without exposing the access token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>provider outage</html>", { status: 503 })));
    await expect(publishThreadsPost({ ownerUserId: 1, text: "Gemini Bot EA note", waitMs: 0 })).rejects.toThrow("Threads rejected the media container");
    await expect(publishThreadsPost({ ownerUserId: 1, text: "Gemini Bot EA note", waitMs: 0 })).rejects.not.toThrow("server-secret-token");
  });
});
