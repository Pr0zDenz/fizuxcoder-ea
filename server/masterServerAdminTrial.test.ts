import { afterEach, describe, expect, it, vi } from "vitest";
import { issueGeminiAdminTrial } from "./masterServer";

describe("MasterServer Gemini admin trial client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the protected seven-day Gemini trial request", async () => {
    vi.stubEnv("MASTER_SERVER_BASE_URL", "https://signal.fizuxc0der.uk");
    vi.stubEnv("MASTER_SERVER_SYNC_KEY", "sync-key");
    vi.stubEnv("FULFILLMENT_ADMIN_KEY", "fulfillment-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "success",
      account_number: "1100543436",
      expiry: "2026-09-13",
      trial_label: "ADMIN TRIAL — NOT CUSTOMER PURCHASE",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(issueGeminiAdminTrial({ email: "xtr0zen@gmail.com", clientName: "Gemini Bot Admin Trial", accountNumber: "1100543436", durationDays: 7 })).resolves.toMatchObject({ account_number: "1100543436", expiry: "2026-09-13" });
    expect(fetchMock).toHaveBeenCalledWith("https://signal.fizuxc0der.uk/admin/license/gemini-trial", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-Fulfillment-Admin-Key": "fulfillment-key" }),
      body: JSON.stringify({ email: "xtr0zen@gmail.com", client_name: "Gemini Bot Admin Trial", product_id: "gemini-bot-ea", account_number: "1100543436", duration_days: 7 }),
    }));
  });
});
