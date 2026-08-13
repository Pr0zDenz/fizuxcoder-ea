# Payment Portal Validation Notes

- The live ToyyibPay `getCategoryDetails` endpoint accepts the configured User Secret Key and confirms both configured categories as active: `o4ybe3cc` for 3S Universal and `x42sivvj` for Gemini Bot.
- ToyyibPay returned an object-shaped category payload for this account rather than the array shown in one documentation example; the server parser now accepts both shapes.
- The public `/portal` route renders the Signal Ledger customer-access view, product cards, unauthenticated sign-in calls to action, and protected-library explanation.
- The protected customer library is deliberately empty before a signed payment callback produces an entitlement. All package downloads are requested through authenticated server procedures.
- Static type checking, the full Vitest suite, and the production build completed successfully after the final portal changes.

## Direct Payment Link Verification

The supplied Gemini payment link (`t1rvxbft`) opens the active **Gemini Bot EA** ToyyibPay checkout and displays RM450.00. The supplied 3S payment link (`3-Serangkai-EA`) opens the active **3 Serangkai EA** ToyyibPay checkout and displays RM2,999.00. Both pages were inspected without entering customer details or submitting a payment.

The first published-portal check immediately after the direct-checkout release still returned the previous portal interface; the release needs cache-propagation confirmation before the buyer-facing control validation can be marked complete.

Subsequent cache-busted published portal verification confirmed the current direct-payment release is active. It displays the verified original prices, promotional prices, and savings, and the buyer controls resolve directly to the active 3S (`3-Serangkai-EA`) and Gemini (`t1rvxbft`) ToyyibPay pages without invoking the former mutation endpoint.

The published portal exposes buyer controls as plain direct anchors—rather than mutation buttons—to `https://toyyibpay.com/3-Serangkai-EA` and `https://toyyibpay.com/t1rvxbft`. Following the 3S control in the browser initiated an external navigation attempt; re-opening the cache-busted portal confirmed the direct-anchor implementation remained intact. No payment details were entered and no transaction was submitted during verification.
