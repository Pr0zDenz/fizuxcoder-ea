import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const sourceUrl = new URL("../docs/release-records/mql5/3SUniversalEA_customer_license_Cloudflare_v13.92.mq5", import.meta.url);

describe("3S Universal EA Cloudflare source release", () => {
  it("uses the current Cloudflare MasterServer routes and contains no legacy ngrok endpoint", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain('MLN_Predict_URL = "https://signal.fizuxc0der.uk/mln_predict"');
    expect(source).toContain('MLN_Feedback_URL = "https://signal.fizuxc0der.uk/mln_feedback"');
    expect(source).toContain('License_Activate_URL = "https://signal.fizuxc0der.uk/license/activate"');
    expect(source).toContain('Macro_Trigger_URL = "https://signal.fizuxc0der.uk/trigger_macro"');
    expect(source).not.toContain("ngrok-free.dev");
  });

  it("keeps external provider credentials on the MasterServer and logs server Y10/FRED status", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain('input string FRED_API_Key = ""; // Optional local fallback only; production provider credentials belong on MasterServer.');
    expect(source).toContain('string fred_status = respData["provider_status"]["fred"]["status"].ToStr();');
    expect(source).toContain('StringFormat("y10=%d|fred=%s|detail=%s", py_y10, fred_status, fred_message)');
    expect(source).toContain('Print("3S EA: MasterServer Y10 status: ", y10_status);');
  });

  it("preserves customer-key authentication and account-bound activation parameters", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain("X-API-Key: ");
    expect(source).toContain('\\"license_id\\"');
    expect(source).toContain('\\"activation_code\\"');
    expect(source).toContain('\\"account_number\\"');
  });
});
