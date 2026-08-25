import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../integrations/mql5/GeminiBotEAv11.97_authenticated_MLN_direct_upload.mq5", import.meta.url);

describe("Gemini direct MQL5 screenshot upload source", () => {
  it("uses the portal draft-intake contract and dedicated secret", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain('const string   GEMINI_EVENT_PORTAL_URL    = "https://fizuxea-jxctlods.manus.space/api/threads/gemini-event";');
    expect(source).toContain("X-Gemini-Event-Key");
    expect(source).toContain("Gemini_Event_Ingest_Key");
    expect(source).not.toContain("X-Master-Sync-Key");
  });

  it("captures only from setup and take-profit hooks and keeps upload work on the timer", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain("QueueMarketingScreenshot(\"setup\")");
    expect(source).toContain("QueueMarketingScreenshot(\"take_profit\")");
    expect(source).toContain("ProcessMarketingScreenshotQueue();");
    expect(source).toContain("ChartScreenShot(0, file_name, Screenshot_Width, Screenshot_Height, ALIGN_RIGHT)");
    expect(source).toContain("uploaded = UploadMarketingScreenshot(file_name, event_type, event_id, event_time);");
    expect(source).toContain("IsoUtc(event_time)");
    expect(source).toContain("next_marketing_retry_time = TimeCurrent() + 30");
    expect(source).toContain("Marketing screenshot retained for retry with the same event id");
  });

  it("has local throttling and an 8 MB client-side limit", async () => {
    const source = await readFile(sourceUrl, "utf8");
    expect(source).toContain("Screenshot_Min_Interval_Sec");
    expect(source).toContain("file_size > 8 * 1024 * 1024");
    expect(source).toContain("FileDelete(file_name);");
    expect(source).toContain("uint bytes_read = FileReadArray(handle, bytes, 0, file_size);");
    expect(source).not.toContain("int read = FileReadArray(handle, bytes, 0, file_size);");
  });
});
