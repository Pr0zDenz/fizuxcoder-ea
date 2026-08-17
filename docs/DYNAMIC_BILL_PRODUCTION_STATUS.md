# Dynamic Bill and Production Callback Status

## Verified and deployed

The published customer portal uses the existing direct ToyyibPay permanent checkout links for the two buyer-facing products. A signed-in buyer can claim a completed permanent-bill transaction only when the receipt e-mail and expected amount match; protected package access then depends on the resulting active entitlement.

The owner-only RM1 live test was completed against `TEST-Gemini-Bot-EA` as a permanent-bill fallback. Its evidence is recorded in [`RM1_LIVE_TEST_EVIDENCE.md`](./RM1_LIVE_TEST_EVIDENCE.md). It validated the isolated entitlement, Master Server test-licence synchronization, MT5 binding and replacement, and signed test-only delivery.

## Intentionally not claimed as verified

The RM1 fallback bill was pre-created. Its settlement did **not** prove that ToyyibPay delivered a callback for an API-created dynamic bill. The portal’s callback-enabled API route remains owner-only and is not the buyer-facing checkout path.

| Capability | Current status | Buyer or licence impact |
|---|---|---|
| Permanent Gemini and 3S checkout links | Published | Buyers can pay through their existing ToyyibPay bills. |
| Receipt-based entitlement claim | Published | Requires verified settlement reference, e-mail, and amount. |
| Isolated RM1 fallback test | Verified | Test product and test receipt only; no production EA package or production licence. |
| API-created callback-enabled dynamic bill | Not live-verified | Must not be represented as proven automatic production settlement. |
| Automatic Master Server pending licence from a real callback | Not live-verified for an API-created bill | The server code and tests exist; a separate user-authorized payment is required to verify the live provider-to-callback sequence. |

## Safe next test if automatic production callbacks are required

An owner may authorize creation of a new **isolated** callback-enabled RM1 bill through the owner-only route. Before payment, inspect its RM1 amount and recipient identity. After successful payment, confirm: ToyyibPay callback accepted; portal order and entitlement recorded; Master Server pending licence created; and test-only receipt delivered. Do not use a production EA package for that experiment.
