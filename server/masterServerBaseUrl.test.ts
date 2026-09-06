import { describe, expect, it } from "vitest";

describe("Master Server base URL", () => {
  it("reaches the configured HTTPS root endpoint", async () => {
    const baseUrl = process.env.MASTER_SERVER_BASE_URL?.replace(/\/+$/, "");
    expect(baseUrl).toMatch(/^https:\/\//);
    const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(10_000) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type") ?? "").toContain("application/json");
  }, 15_000);
});
