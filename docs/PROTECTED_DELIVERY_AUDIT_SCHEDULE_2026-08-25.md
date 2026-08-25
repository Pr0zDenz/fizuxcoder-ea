# Protected Delivery Audit Schedule

## Active configuration

The protected-delivery audit is configured as a **read-only fresh-cycle audit** for the restored Master Server endpoint `https://ruby-railroad-trimester.ngrok-free.dev`. The platform heartbeat task is named `protected-delivery-audit-monthly`, uses task UID `J97G8zf2EnKskpoQFfZcWn`, and calls `/api/scheduled/protected-delivery-audit` with HTTP `POST` and an empty JSON payload.

The cron expression is `0 0 1 1 * *`, interpreted by the Heartbeat service as six fields in UTC: second `0`, minute `0`, hour `1`, day-of-month `1`, every month, every weekday. This is **09:00 on the first day of each month in Asia/Kuala_Lumpur**. The callback resolves the schedule by the authenticated task UID rather than trusting callback payload data.

## Fresh-cycle behavior

Each cycle is keyed by the UTC calendar month in `YYYY-MM` form. A completed, skipped, or already-running cycle for the same schedule and month is not duplicated. A failed cycle may be retried by the next callback and is recorded separately from successful cycles.

The audit counts non-test protected-delivery audit records and active non-test entitlements, then performs a non-mutating HTTPS `GET` reachability probe against the configured Master Server URL. It does not call licence binding, payment callback, test-entitlement synchronization, fulfilment issuance, MT5 rebinding, package delivery, or payment APIs. If the endpoint is unreachable, the cycle remains an auditable completed probe with a recorded network-error classification; it does not manufacture a success or alter customer access.

## Verification

The schedule was created and verified on 25 August 2026. The platform reported one enabled job with the expected name, task UID, callback path, `POST` method, and cron expression. The durable database row matches the same task UID, URL, and enabled state. No audit cycle was manually triggered during setup, so the first normal cycle will be created by the platform callback on the next first-of-month execution boundary.
