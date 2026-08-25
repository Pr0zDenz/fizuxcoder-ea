# Gemini Bot EA VPS Event Intake Runbook

This runbook describes the evergreen marketing intake used by the Gemini Bot EA VPS. It is intentionally **draft-only**: a setup or take-profit event may create a private image-backed draft, but it never publishes to Threads without the administrator reviewing and approving the draft in `/admin/marketing`.

## Endpoint

Use the deployed portal URL:

```text
POST https://fizuxea-jxctlods.manus.space/api/threads/gemini-event
```

The VPS must send the same shared secret configured as `MASTER_SERVER_SYNC_KEY` in the portal. Send it in the `X-Master-Sync-Key` header. Do not place the secret in a screenshot, query string, EA input, log line, or browser-visible page.

The request body is JSON:

```json
{
  "eventId": "gemini-2026-08-26-1101009305-tp-000042",
  "eventType": "take_profit",
  "screenshotMimeType": "image/png",
  "screenshotBase64": "iVBORw0KGgoAAAANSUhEUg...",
  "occurredAt": "2026-08-26T09:30:00.000Z",
  "accountLabel": "Demo account",
  "symbol": "XAUUSD",
  "profitAmount": 47.10
}
```

`eventType` must be either `setup` or `take_profit`. `screenshotMimeType` must be `image/png`, `image/jpeg`, or `image/webp`. The decoded image is capped at 8 MB and its magic bytes must match the declared MIME type. `eventId` must be stable for the same VPS event; it is the idempotency key.

## Windows PowerShell smoke test

Run this from the VPS after replacing the placeholders. The sample uses a tiny valid PNG only to verify the HTTP contract; it is not a real trading screenshot.

```powershell
$portal = "https://fizuxea-jxctlods.manus.space"
$syncKey = $env:MASTER_SERVER_SYNC_KEY
$pngBase64 = "iVBORw0KGgo="

$headers = @{
  "X-Master-Sync-Key" = $syncKey
  "Content-Type" = "application/json"
}

$body = @{
  eventId = "smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
  eventType = "setup"
  screenshotMimeType = "image/png"
  screenshotBase64 = $pngBase64
  occurredAt = [DateTime]::UtcNow.ToString("o")
  accountLabel = "VPS smoke test"
  symbol = "XAUUSD"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$portal/api/threads/gemini-event" -Method Post -Headers $headers -Body $body
```

A new event returns HTTP `201` with `created: true`. Re-sending the same `eventId` returns HTTP `200` with `created: false`; the existing draft is reused and no second image is uploaded. A missing or incorrect key returns HTTP `401`. Invalid event data or image bytes returns HTTP `400`.

## VPS implementation boundary

The Master Server or EA-side event handler should call this endpoint only after it has a meaningful setup or take-profit event and a completed screenshot. Keep the event identifier deterministic, for example by combining the account number, event type, terminal event timestamp, and an incrementing trade or setup identifier. Do not send every market tick. Do not retry with a new event ID after a timeout; retry the same event ID with bounded backoff so the portal can deduplicate it.

The portal stores the screenshot in S3-backed storage and creates a Gemini Bot EA marketing draft with the landing-page portal link appended. The draft has no expiry date. The administrator must review the screenshot, caption, destination, and risk notice, then choose **Approve & publish** in the private studio. Rejected or superseded records remain private and are not provider rejections.

## Troubleshooting

If the response is `401`, confirm that the VPS environment variable is named exactly `MASTER_SERVER_SYNC_KEY` and that the header is `X-Master-Sync-Key`. If the response is `400`, inspect the JSON shape, MIME type, Base64 value, and event type. If the response is `503`, the owner administrator identity is unavailable in the portal database; do not bypass the route or publish directly from the VPS.

A successful intake proves only **authenticated screenshot storage and draft creation**. It does not prove that Threads is connected or that a post was published. Threads publication remains a separate, administrator-approved action and can be verified in the studio by the external post ID and provider response.
