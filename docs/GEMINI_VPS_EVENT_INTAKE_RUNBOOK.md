# Gemini Bot EA VPS Event Intake Runbook

This runbook describes the evergreen marketing intake used by the Gemini Bot EA VPS. It is intentionally **draft-only**: a setup or take-profit event may create a private image-backed draft, but it never publishes to Threads without the administrator reviewing and approving the draft in `/admin/marketing`.

## Endpoint

Use the deployed portal URL:

```text
POST https://fizuxea-jxctlods.manus.space/api/threads/gemini-event
```

The EA must send the dedicated `GEMINI_EVENT_INGEST_KEY` in the `X-Gemini-Event-Key` header. Do not reuse `MASTER_SERVER_SYNC_KEY`, and do not place the ingest key in a screenshot, query string, log line, or browser-visible page. Because a secret entered into a compiled EA can potentially be extracted, rotate this key if the EA package is redistributed or compromised.

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
$syncKey = $env:GEMINI_EVENT_INGEST_KEY
$pngBase64 = "iVBORw0KGgo="

$headers = @{
  "X-Gemini-Event-Key" = $syncKey
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

The EA should call this endpoint only after it has a meaningful setup or take-profit event and a completed screenshot. `ChartScreenShot` writes to the terminal’s `MQL5\\Files` directory; the direct-upload helper reads and deletes the same file only after a successful or duplicate-safe portal response. Keep the event identifier deterministic, for example by combining the account number, event type, terminal event timestamp, and an incrementing trade or setup identifier. Do not send every market tick. Do not retry with a new event ID after a timeout; retry the same event ID with bounded backoff so the portal can deduplicate it.

The portal stores the screenshot in S3-backed storage and creates a Gemini Bot EA marketing draft with the landing-page portal link appended. The draft has no expiry date. The administrator must review the screenshot, caption, destination, and risk notice, then choose **Approve & publish** in the private studio. Rejected or superseded records remain private and are not provider rejections.

## Troubleshooting

If the response is `401`, confirm that the EA input contains the current dedicated ingest key and that the header is `X-Gemini-Event-Key`. If the response is `400`, inspect the JSON shape, MIME type, Base64 value, and event type. If the response is `503`, the owner administrator identity is unavailable in the portal database; do not bypass the route or publish directly from the VPS.

A successful intake proves only **authenticated screenshot storage and draft creation**. It does not prove that Threads is connected or that a post was published. Threads publication remains a separate, administrator-approved action and can be verified in the studio by the external post ID and provider response.

## Direct EA configuration

The direct-upload build is stored in `integrations/mql5/GeminiBotEAv11.97_authenticated_MLN_direct_upload.mq5`. Compile it in MetaEditor on the VPS, attach it to the intended Gemini Bot chart, and confirm the existing indicators and dashboard render normally before enabling marketing capture.

In MT5, open **Tools → Options → Expert Advisors**, enable **Allow WebRequest for listed URL**, and add:

```text
https://fizuxea-jxctlods.manus.space
```

Set the following EA inputs:

| Input | Recommended value | Purpose |
|---|---:|---|
| `Enable_Marketing_Screenshot` | `true` | Master switch for automatic evidence capture. |
| `Capture_Setup_Screenshot` | `true` | Capture after confirmed setup orders are placed. |
| `Capture_TakeProfit_Screenshot` | `true` | Capture after the basket take-profit close path completes. |
| `Gemini_Event_Ingest_Key` | Dedicated key from secure configuration | Sends `X-Gemini-Event-Key`; never enter the licensing sync key. |
| `Screenshot_Width` | `1280` | PNG width. |
| `Screenshot_Height` | `720` | PNG height. |
| `Screenshot_Min_Interval_Sec` | `15` | Prevents repeated captures during rapid event transitions. |

The EA queues the event and processes the screenshot from its one-second timer. It uses the current chart viewport, including visible Gemini dashboard/chart objects, writes a PNG into the terminal `MQL5\\Files` directory, Base64-encodes it, and sends it directly to the portal. If the portal is temporarily unavailable, it retries once immediately and then retries the same event ID after a short delay. The trade decision itself does not call the upload inline.

Before using a real account, test on a demo chart with both capture inputs enabled and inspect the **Experts** log for a response such as `HTTP=201` or `HTTP=200`. Then open the administrator Marketing Studio and confirm the new item is a private draft with one image and no expiry. Do not approve the smoke-test item unless you intentionally want to publish it.

## Connection ping

The direct-upload EA performs a lightweight authenticated ping from its timer without taking a screenshot, creating a draft, placing an order, or publishing to Threads. The endpoint is:

```text
GET https://fizuxea-jxctlods.manus.space/api/threads/gemini-event/ping
```

Keep `Ping_Portal_On_Timer=true` to enable the check and use `Ping_Interval_Sec=300` for one check every five minutes. For a faster temporary diagnostic, set the interval to `30`; restore `300` afterward. The Experts log should show `Gemini event portal ping OK HTTP=200` when the URL, WebRequest permission, and dedicated ingest key are correct.

If the log shows HTTP `401`, the key is wrong or the header is missing. If it shows MT5 error `4060`, add the portal origin to the WebRequest allowlist. If it shows a network or HTTP failure, the portal or network path is unavailable; screenshot events remain queued by the EA and are not silently treated as uploaded. The ping response includes `draftOnly: true`, confirming that the route is not a publishing or trading endpoint.
