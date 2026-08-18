# Production Operating Boundary

## Selected customer purchase path

The selected production path is the existing permanent ToyyibPay checkout bill for each EA product, followed by portal receipt verification. This path is independent of the owner-only test benches.

| Stage | Production operating rule |
|---|---|
| Checkout | Customer opens the correct permanent ToyyibPay bill for Gemini or 3S. |
| Settlement evidence | Customer signs in with the same checkout e-mail and supplies the ToyyibPay settlement reference. |
| Entitlement | The portal verifies product, amount, paid status, and matching e-mail before granting access. |
| Licence | Customer enters the MT5 number; the Master Server binds or replaces it. |
| Delivery | The customer receives a short-lived signed link only for files in their active product library. |

## Test-only controls

The owner-only RM1 permanent fallback and no-charge simulation are isolated to `test-gemini-bot-ea`. They are not buyer-facing checkout products and expose only `FizuxCoder_RM1_Test_Receipt.txt`.

## Deferred work

The API-created dynamic-bill callback sequence is explicitly deferred. It is not required by the selected permanent-bill production path and must not be described as live-verified automation until a separately authorized payment through an API-created callback-enabled bill has completed.
