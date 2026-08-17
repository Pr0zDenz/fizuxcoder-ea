import { afterEach, describe, expect, it, vi } from "vitest";
import { bindMasterServerLicence, syncMasterServerTestEntitlement } from "./masterServer";

const originalBaseUrl = process.env.MASTER_SERVER_BASE_URL;
const originalSyncKey = process.env.MASTER_SERVER_SYNC_KEY;

afterEach(() => {
  process.env.MASTER_SERVER_BASE_URL = originalBaseUrl;
  process.env.MASTER_SERVER_SYNC_KEY = originalSyncKey;
  vi.unstubAllGlobals();
});

describe("bindMasterServerLicence", () => {
  it("sends only the required binding fields to the protected Master Server route", async () => {
    process.env.MASTER_SERVER_BASE_URL = "https://master.example.test/";
    process.env.MASTER_SERVER_SYNC_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ account_number: "12345678", expiry: "2027-08-13" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await bindMasterServerLicence({ email: "customer@example.test", productId: "gemini-bot-ea", accountNumber: "12345678" });

    expect(result.account_number).toBe("12345678");
    expect(fetchMock).toHaveBeenCalledWith("https://master.example.test/license/bind", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-Master-Sync-Key": "test-key" }),
      body: JSON.stringify({ email: "customer@example.test", product_id: "gemini-bot-ea", account_number: "12345678" }),
    }));
  });

  it("uses the separate test-only synchronization route and does not submit a product chosen by the browser", async () => {
    process.env.MASTER_SERVER_BASE_URL = "https://master.example.test/";
    process.env.MASTER_SERVER_SYNC_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accepted: true, issued: true, product_id: "test-gemini-bot-ea" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncMasterServerTestEntitlement({ email: "customer@example.test", paymentReference: "TP-RM1-TEST" })).resolves.toMatchObject({ product_id: "test-gemini-bot-ea" });

    expect(fetchMock).toHaveBeenCalledWith("https://master.example.test/license/sync-test-entitlement", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-Master-Sync-Key": "test-key" }),
      body: JSON.stringify({ email: "customer@example.test", payment_reference: "TP-RM1-TEST" }),
    }));
  });
});
