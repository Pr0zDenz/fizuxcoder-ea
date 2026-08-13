import { describe, expect, it } from "vitest";

const masterServerBaseUrl = process.env.MASTER_SERVER_BASE_URL?.replace(/\/+$/, "");
const masterServerSyncKey = process.env.MASTER_SERVER_SYNC_KEY;

describe("Master Server credential", () => {
  it("authenticates a non-destructive invalid binding request", async () => {
    expect(masterServerBaseUrl).toBeTruthy();
    expect(masterServerSyncKey).toBeTruthy();

    const response = await fetch(`${masterServerBaseUrl}/license/bind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Sync-Key": masterServerSyncKey!,
      },
      // Empty values deliberately exercise validation only; no licence can be changed.
      body: JSON.stringify({ email: "", product_id: "", account_number: "" }),
    });

    expect(response.status).toBe(400);
  }, 15_000);

  it("exposes the payment callback route and rejects unsigned input without changing licence data", async () => {
    expect(masterServerBaseUrl).toBeTruthy();
    const response = await fetch(`${masterServerBaseUrl}/payment_success`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "ngrok-skip-browser-warning": "1",
      },
      body: "",
    });

    expect(response.status).toBe(400);
  }, 15_000);
});
