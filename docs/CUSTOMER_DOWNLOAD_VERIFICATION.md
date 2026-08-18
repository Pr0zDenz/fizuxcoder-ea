# Customer EA Download Verification Procedure

## Purpose

Use this procedure after a real customer purchase to confirm that the correct customer can obtain the correct EA package, while unverified or expired accounts cannot obtain a file link.

> **Important:** The buyer-facing process uses an existing permanent ToyyibPay payment bill. The customer must complete payment in ToyyibPay before the receipt can be claimed. A browser redirect alone is not payment confirmation.

## Customer success path

| Step | Customer action | Expected portal result |
|---|---|---|
| 1 | Open `https://fizuxea-jxctlods.manus.space/portal` and sign in with the e-mail used at ToyyibPay checkout. | The customer sees **Your eligible downloads**. |
| 2 | Select the product actually purchased, enter the ToyyibPay invoice or settlement reference, and select **Verify receipt**. | The portal checks the permanent bill transaction, exact expected amount, status, and receipt e-mail. |
| 3 | Select **Refresh access**. | A card for the purchased product appears with **Access active**. |
| 4 | Enter the numeric MT5 account and select **Activate MT5**. | The portal binds that account to the entitlement and synchronizes the licence with the Master Server. |
| 5 | Select the listed EA or indicator file. | The portal creates a short-lived signed download URL for that one protected file. |

## Owner verification checks

| Check | What it proves |
|---|---|
| Product card appears only after receipt verification | The customer has an active entitlement for that product. |
| The card lists the expected `.ex5` files | The protected product library was attached to the correct product. |
| The file opens from the library | The entitlement, file authorization, and signed-delivery path are working. |
| Protected delivery audit row is created | The system records the delivered user, product, file, entitlement, and delivery time without storing the signed URL or file contents. |
| Master Server returns authorization for the bound MT5 account | The EA licence is active for the selected MT5 account. |

## Denied-access checks

The implementation is tested to deny the protected file when any of the following applies:

| Case | Expected result |
|---|---|
| Customer has no entitlement for the file’s product | No signed download URL is returned. |
| Entitlement is expired | No signed download URL is returned. |
| Customer tries a file identifier from another product | No signed download URL is returned. |
| Receipt e-mail differs from the signed-in account | The receipt claim is rejected. |
| Receipt was already claimed | The duplicate claim is rejected. |

## Recommended first real-customer verification

For the first normal Gemini or 3S sale, ask the customer to send only their ToyyibPay **settlement reference** and the e-mail they used for checkout. Do not ask them to send payment-card or banking credentials. While signed in to their own portal account, guide them through the five success-path steps above. Confirm the product card and expected package filename before they download it.

## Test coverage

The automated protected-download tests cover active entitlement approval, expired entitlement denial, missing-entitlement denial, and a delivery-audit record for approved access. The owner-only RM1 test product remains isolated from Gemini and 3S production package libraries.
