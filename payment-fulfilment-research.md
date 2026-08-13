# Payment and Fulfilment Research Notes

## Supplied Reference Site

The reviewed reference site uses a focused conversion path: an explanatory product landing page, a transparent pricing section, demo-oriented calls to action, a safety/risk section, tutorials, customer-support routes, and a separate customer-access environment. The transferable design principles are to make product contents explicit, keep risk language visible, provide a clear setup path, and reserve customer downloads for authenticated post-purchase access. Performance marketing tactics and unverified claims will not be replicated.

## ToyyibPay API Reference

The official API reference identifies a server-to-server callback payload with `refno`, `status`, `reason`, `billcode`, `order_id`, `amount`, `transaction_time`, and `hash`. It defines payment status `1` as successful, `2` as pending, and `3` as failed. ToyyibPay instructs integrators to validate the callback hash before processing a payment, using `MD5(userSecretKey + status + order_id + refno + "ok")`. The documentation also notes that callbacks cannot be received on localhost. The implementation will therefore verify the callback in a server route, record the completed order idempotently, and grant package access only after a valid successful callback.

## Proposed Package Mapping

| Product | Payment bill code supplied | Fulfilment package |
| --- | --- | --- |
| Gemini Bot EA v11.97 | `x42sivvj` | `GeminiBotEAv11.97.ex5`, `FizuxCoder_News_Calendar_v5.00_Tradays.ex5`, and `FMCBR-Fractal.ex5` |

## Category Screenshot Reconciliation

The latest supplied category screenshot verifies the following code-to-item pairs: `o4ybe3cc` for **3 Serangkai Universal v13.85**, `ue1h9ywv` for **Raya Gallery Labs**, and `x42sivvj` for **Gemini Bot EA v11.97**. The final status column is confirmed separately in the final crop.

The final crop verifies that all three entries are marked **Active**. The payment-link correction supplied earlier for Gemini Bot remains authoritative: `https://toyyibpay.com/t1rvxbft`.

## Current Permanent-Bill Reconciliation

The active 3S permanent bill shown in the latest dashboard is **3 Serangkai EA** with bill code `3-Serangkai-EA`. It accepts multiple payments, is restricted to FPX, and is currently unpaid. The older **3 Serangkai UNIVERSAL** bill is marked inactive. The supplied direct portal link therefore correctly targets the current active bill rather than the older inactive record.

The Gemini bill dashboard also distinguishes an older inactive record from the active permanent bill. The current active record is **Gemini Bot EA** with bill code `t1rvxbft`; it accepts multiple payments, is restricted to FPX, and is currently unpaid. This agrees with the supplied Gemini direct checkout URL.

The category dashboard verifies that `o4ybe3cc` is the active **Expert Advisor 3S** category with description **3 Serangkai Universal EA**, while `x42sivvj` is the active **Expert Advisor** category with description **Gemini Bot EA**. The intermediate `ue1h9ywv` category belongs to Raya Gallery Labs and is not used by the portal catalogue.
| 3 Serangkai UNIVERSAL EA v13.85 | `o4ybe3ce` | `3SUniversalEA.ex5`, `DT3-ZigZag-LauerX.ex5`, `3SBasketDashboard.ex5`, `3SMatrixDashboard.ex5`, `3STradaysNewsCalendar.ex5`, `TradeHistory.ex5`, and `FMCBR-Fractal.ex5` |

## Sources

1. [osasFXea membership-site reference](https://vip.osasfxea.com/)
2. [ToyyibPay API Reference](https://toyyibpay.com/apireference/)
