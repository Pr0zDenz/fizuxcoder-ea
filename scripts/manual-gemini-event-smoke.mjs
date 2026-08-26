const portal = "https://fizuxea-jxctlods.manus.space";
const ingestKey = process.env.GEMINI_EVENT_INGEST_KEY;

if (!ingestKey) {
  throw new Error("GEMINI_EVENT_INGEST_KEY is not available in this environment");
}

const headers = { "X-Gemini-Event-Key": ingestKey };
const pingResponse = await fetch(`${portal}/api/threads/gemini-event/ping`, { headers });
const pingText = await pingResponse.text();
console.log(JSON.stringify({ step: "ping", status: pingResponse.status, contentType: pingResponse.headers.get("content-type"), body: pingText }));

if (!pingResponse.ok || !pingText.includes('"service":"gemini-event-intake"') || !pingText.includes('"draftOnly":true')) {
  throw new Error(`Ping health check failed with HTTP ${pingResponse.status}`);
}

const eventId = `manual-smoke-${Date.now()}`;
const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const uploadResponse = await fetch(`${portal}/api/threads/gemini-event`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({
    eventId,
    eventType: "setup",
    screenshotMimeType: "image/png",
    screenshotBase64: onePixelPng,
    occurredAt: new Date().toISOString(),
    accountLabel: "manual smoke test",
    symbol: "XAUUSD",
  }),
});
const uploadText = await uploadResponse.text();
console.log(JSON.stringify({ step: "upload", eventId, status: uploadResponse.status, contentType: uploadResponse.headers.get("content-type"), body: uploadText }));

if (![200, 201].includes(uploadResponse.status)) {
  throw new Error(`Draft-only upload failed with HTTP ${uploadResponse.status}`);
}

const result = JSON.parse(uploadText);
if (result.ok !== true || !["draft", "unapproved"].includes(result.status)) {
  throw new Error(`Unexpected non-draft upload response: ${uploadText}`);
}
console.log(JSON.stringify({ step: "result", eventId, created: result.created, status: result.status, contentItemId: result.contentItemId, published: false }));
