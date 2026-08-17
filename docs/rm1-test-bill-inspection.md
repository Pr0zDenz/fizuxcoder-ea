# RM1 Test Bill Inspection

The user-supplied ToyyibPay checkout `https://toyyibpay.com/TEST-Gemini-Bot-EA` was inspected on 2026-08-18 without submitting any payment.

| Field | Observed value |
|---|---|
| Bill code | `TEST-Gemini-Bot-EA` |
| Displayed name | `TEST-Gemini Bot EA` |
| Displayed amount | RM1.00 |
| Customer inputs | Email, name, and telephone number required |
| Available payment channels | Online Banking and DuitNow QR |
| Customer receipt reference shown before payment | `TP2608180800271715` |

The checkout page itself does not disclose its configured callback URL or external reference. It must therefore be treated as a permanent-bill fallback: the portal must verify the completed transaction through ToyyibPay’s transaction API, match the authenticated buyer email and exact RM1 amount, and grant only the isolated test-product entitlement. It cannot be assumed to trigger the Master Server callback automatically without confirmed dashboard or API configuration.
