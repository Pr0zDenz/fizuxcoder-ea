# Payment Portal Validation Notes

- The live ToyyibPay `getCategoryDetails` endpoint accepts the configured User Secret Key and confirms both configured categories as active: `o4ybe3cc` for 3S Universal and `x42sivvj` for Gemini Bot.
- ToyyibPay returned an object-shaped category payload for this account rather than the array shown in one documentation example; the server parser now accepts both shapes.
- The public `/portal` route renders the Signal Ledger customer-access view, product cards, unauthenticated sign-in calls to action, and protected-library explanation.
- The protected customer library is deliberately empty before a signed payment callback produces an entitlement. All package downloads are requested through authenticated server procedures.
- Static type checking, the full Vitest suite, and the production build completed successfully after the final portal changes.

## Direct Payment Link Verification

The supplied Gemini payment link (`t1rvxbft`) opens the active **Gemini Bot EA** ToyyibPay checkout and displays RM450.00. The supplied 3S payment link (`3-Serangkai-EA`) opens the active **3 Serangkai EA** ToyyibPay checkout and displays RM2,999.00. Both pages were inspected without entering customer details or submitting a payment.
