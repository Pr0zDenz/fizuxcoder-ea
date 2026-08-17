# RM1 Live Test Evidence

**Test date:** 17 August 2026  
**Scope:** Owner-only, isolated `test-gemini-bot-ea` entitlement. This evidence does not represent a production EA purchase or production licence.

## Verified flow

| Step | Evidence | Result |
|---|---|---|
| Receipt verification | Permanent RM1 bill `TEST-Gemini-Bot-EA`, settlement reference `TP2608132020278757`, owner e-mail matched in the portal database | Test-only entitlement active. |
| Product isolation | Receipt and entitlement joined only to `test-gemini-bot-ea`, with `isTest = yes`; production order and entitlement association query returned zero rows | No production Gemini or 3S entitlement was unlocked. |
| First MT5 bind | Portal reported active binding for `1101009305`; database stored the same account on the test entitlement | Test pending licence was synchronized and bound. |
| Re-binding | Portal replaced `1101009305` with `1101009306` | Replacement was recorded without a second entitlement. |
| Master Server authorization | `/config` returned HTTP 403 `ACCOUNT_NOT_REGISTERED` for `1101009305`; it returned HTTP 200 `AUTHORIZED` for `1101009306` | Only the replacement dummy account remained authorized. |
| Protected delivery | Audit record `protectedDeliveryAudits.id = 1` records `test-gemini-bot-ea`, `FizuxCoder_RM1_Test_Receipt.txt`, and MT5 account `1101009306` | A signed link delivered the test receipt only. |

## Delivery-artifact statement

The delivered text states that it is a protected test-only artifact for payment verification, entitlement activation, MT5 binding, and signed delivery. It explicitly states that it is **not an EA package** and does **not** grant production EA access.

## Configuration safeguards verified

The portal-to-Master-Server binding and test-entitlement sync calls include `ngrok-skip-browser-warning: 1`, required for protected POST forwarding over the currently configured ngrok URL. The Master Server's local listener was also verified to reject an unauthenticated bind request with HTTP 401.

## Important limitation

This live test used the supplied **permanent RM1 fallback bill** and receipt verification. It did not prove a live automatic ToyyibPay callback from an API-created dynamic bill. The production buyer-facing permanent bills remain direct checkout links; their portal receipt-claim path is implemented. A separately successful API-created callback-enabled bill must still be captured before claiming that automatic callback settlement is verified for a production purchase.
