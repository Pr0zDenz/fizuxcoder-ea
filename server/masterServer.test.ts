import { afterEach, describe, expect, it, vi } from "vitest";
import { bindMasterServerLicence, issueMasterServerThreeSLicence, syncMasterServerTestEntitlement } from "./masterServer";

const originalBaseUrl = process.env.MASTER_SERVER_BASE_URL;
const originalSyncKey = process.env.MASTER_SERVER_SYNC_KEY;
const originalFulfillmentKey = process.env.FULFILLMENT_ADMIN_KEY;

afterEach(() => {
  process.env.MASTER_SERVER_BASE_URL = originalBaseUrl;
  process.env.MASTER_SERVER_SYNC_KEY = originalSyncKey;
  process.env.FULFILLMENT_ADMIN_KEY = originalFulfillmentKey;
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
      headers: expect.objectContaining({ "X-Master-Sync-Key": "test-key", "ngrok-skip-browser-warning": "1" }),
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
      headers: expect.objectContaining({ "X-Master-Sync-Key": "test-key", "ngrok-skip-browser-warning": "1" }),
      body: JSON.stringify({ email: "customer@example.test", payment_reference: "TP-RM1-TEST" }),
    }));
  });

  it("issues a one-year 3S activation licence only through the dedicated fulfilment credential", async () => {
    process.env.MASTER_SERVER_BASE_URL = "https://master.example.test/";
    process.env.MASTER_SERVER_SYNC_KEY = "sync-key";
    process.env.FULFILLMENT_ADMIN_KEY = "fulfilment-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      license_id: "3S-ORDER123", account_number: "12345678", expiry: "2027-08-19", activation_code: "one-time-code",
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(issueMasterServerThreeSLicence({ licenseId: "3S-ORDER123", clientName: "Customer", accountNumber: "12345678" })).resolves.toMatchObject({ license_id: "3S-ORDER123", expiry: "2027-08-19" });

    expect(fetchMock).toHaveBeenCalledWith("https://master.example.test/admin/license/create", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-Fulfillment-Admin-Key": "fulfilment-key", "ngrok-skip-browser-warning": "1" }),
      body: JSON.stringify({ license_id: "3S-ORDER123", client_name: "Customer", account_number: "12345678", years: 1 }),
    }));
  });
});
