import { describe, expect, it } from "vitest";
import { decodeScreenshot, registerGeminiEventIntakeRoute } from "./geminiEventIntakeRoute";
import { buildGeminiEventMarketingCaption, MARKETING_RISK_NOTICE } from "./marketingStudio";

const PNG_BASE64 = Buffer.from("89504e470d0a1a0a", "hex").toString("base64");

describe("Gemini VPS event intake", () => {
  it("accepts a PNG only when bytes match the declared type", () => {
    expect(decodeScreenshot(PNG_BASE64, "image/png")).toHaveLength(8);
    expect(() => decodeScreenshot(PNG_BASE64, "image/jpeg")).toThrow(/do not match/);
  });

  it("rejects unsupported or malformed screenshot payloads", () => {
    expect(() => decodeScreenshot("not-base64", "image/png")).toThrow(/invalid/);
    expect(() => decodeScreenshot(PNG_BASE64, "application/pdf")).toThrow(/supported/);
  });

  it("keeps TP-hit marketing copy within the final Threads limit and free of public account data", () => {
    const caption = buildGeminiEventMarketingCaption({ eventType: "tp2_hit", occurredLabel: "2026-08-28T03:00:00.000Z", symbol: "XAUUSD" });
    expect(`${caption}\n\n${MARKETING_RISK_NOTICE}`.length).toBeLessThanOrEqual(500);
    expect(caption).toContain("Private Telegram access is controlled");
    expect(caption).not.toContain("230069105");
    expect(caption).not.toContain("Reported event amount");
  });

  it("registers only the dedicated event endpoint", () => {
    const paths: string[] = [];
    registerGeminiEventIntakeRoute({ get: (path: string) => paths.push(`GET ${path}`), post: (path: string) => paths.push(`POST ${path}`) } as never);
    expect(paths).toEqual(["GET /api/threads/gemini-event/ping", "POST /api/threads/gemini-event"]);
  });

  it("keeps the event contract draft-only and portal-directed", async () => {
    const source = await import("./marketingStudio");
    expect(source.GEMINI_EVENT_PORTAL_URL).toBe("https://ea.fizuxc0der.uk/");
    const fs = await import("node:fs/promises");
    const routeText = await fs.readFile(new URL("./geminiEventIntakeRoute.ts", import.meta.url), "utf8");
    const serviceText = await fs.readFile(new URL("./marketingStudio.ts", import.meta.url), "utf8");
    expect(serviceText).toContain("status: \"draft\"");
    expect(serviceText).toContain("approval required");
    expect(routeText).toContain("createGeminiVpsEventDraft");
    expect(routeText).toContain("getOwnerAuditIdentity");
    expect(routeText).toContain("getAdminUsers");
    expect(routeText).toContain("getUserByEmail");
    expect(routeText).toContain("ENV.ownerEmail");
    expect(routeText).toContain("ownerByEmail?.role === \"admin\"");
    expect(routeText).toContain("admins.length === 1");
    expect(routeText).toContain("await upsertUser({ openId: ownerOpenId");
    expect(routeText).toContain('if (!owner || owner.role !== "admin")');
    expect(routeText).toContain('role: "admin"');
    expect(routeText).toContain('if (ownerOpenId)');
    expect(routeText).not.toContain("publishThreadsPost");
    expect(routeText).toContain('"tp1_hit", "tp2_hit", "tp3_hit"');
    expect(serviceText).toContain("telegram_channel_marketing_review");
  });
});
