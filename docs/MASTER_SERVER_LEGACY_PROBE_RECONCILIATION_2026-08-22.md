# Master Server Legacy Probe Reconciliation — 2026-08-22

## Purpose

This record reconciles the opt-in portal credential probes with the route contract in the supplied current production Master Server source. All probes use invalid or empty data and are intended to validate routing, authentication, and request validation only. They do not create, bind, renew, or activate a customer licence.

| Probe | Current route contract | Expected safe status | Reason |
|---|---|---:|---|
| Gemini bind validation | `POST /license/bind` with the correct `X-Master-Sync-Key` and empty required fields | 400 | The route authenticates first, then rejects invalid e-mail, product ID, and account number. |
| Legacy payment callback validation | `POST /payment_success` with no callback fields | 400 | The route rejects missing signed payment-callback fields before staging any entitlement. |
| Retired test-entitlement sync | `POST /license/sync-test-entitlement` | 404 | The current supplied Master Server has no route declaration for this historical endpoint. The portal’s production 3S licence issuer does not depend on it. |
| 3S fulfilment issuer validation | `POST /admin/license/create` with the correct fulfilment key and an empty object | 400 | The route authenticates first, then rejects missing licence fields before writing a customer-key record. |

## Operational conclusion

The status-code drift was caused by a historical probe targeting `/license/sync-test-entitlement`, which is not present in the current Master Server file. The probe now expects **404 Not Found** to document that absence. Gemini production binding remains on `/license/bind`; legacy payment callbacks remain on `/payment_success`; and new 3S one-year API licences are issued only through `/admin/license/create` using the dedicated fulfilment key.

> Do not restore or call a test-entitlement route in production merely to make a probe pass. Any future replacement route must be specified by the Master Server owner, protected by an appropriate server-side credential, and covered by a separate non-destructive test plan.

## References

[1]: https://ruby-railroad-trimester.ngrok-free.dev "FizuxCoder Master Server base URL"
