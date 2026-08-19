# Google OAuth Verification Status

**Updated:** 19 August 2026

## Configured production sender

| Item | Current value |
|---|---|
| Google Cloud project | `fizuxcoder-gmail-automation` / **FizuxCoder Gmail Automation** |
| OAuth app | **FizuxCoder Buyer Email** |
| Sender | `xtr0zen@gmail.com` |
| Requested OAuth permission | `https://www.googleapis.com/auth/gmail.send` only |
| Callback | `https://fizuxea-jxctlods.manus.space/api/gmail/oauth/callback` |
| Live authorization | Stored server-side as an encrypted refresh authorization; the plaintext token is never logged or returned. |
| Live sender check | One clearly labeled administrator-only test message was accepted by Gmail API without creating a portal payment, entitlement, MT5 binding, download, or buyer-delivery audit record. |

## Branding links saved in Google Cloud

- Application home page: <https://fizuxea-jxctlods.manus.space>
- Privacy notice: <https://fizuxea-jxctlods.manus.space/privacy>
- Terms: <https://fizuxea-jxctlods.manus.space/terms>

## Remaining Google verification boundary

Google’s Verification Center shows that the app branding and sensitive data-access request are not yet verified. The project currently lists `manus.space` as the authorized domain. Google directs the project owner to Google Search Console for domain ownership; the FizuxCoder owner does not control the parent `manus.space` DNS zone through this project.

> The application is published, the administrator has successfully authorized the send-only scope, and the sender test passed. However, formal Google sensitive-scope verification should not be submitted until the owner either controls a custom sender/website domain or confirms a verification path acceptable to Google. The portal does not claim that Google verification is complete.

## Owner-selected operating mode

The owner selected the current Manus-domain operating mode on 19 August 2026. Buyer activation emails may be sent from the authorized `xtr0zen@gmail.com` mailbox after a verified production receipt claim. The system applies the existing safeguards: it never sends for RM1 or no-charge test products, it records production delivery status idempotently, and it leaves portal access active even if an e-mail delivery fails.

Formal Google sensitive-scope verification and its demonstration submission are intentionally deferred. If Google revokes, expires, or otherwise restricts this authorization, the portal will continue to verify receipts, maintain entitlements, bind MT5 accounts, and provide protected downloads; it will report the email delivery as unavailable rather than claim a message was sent. A future change to a domain controlled by the owner should restart the Google Search Console ownership and sensitive-scope verification work before making a formal verification claim.

## Submission preparation

Before submitting for verification, review the public privacy and terms pages, capture a Google-approved demonstration showing: administrator sign-in, the owner-only Gmail authorization action, the `gmail.send` consent screen, a verified receipt claim, and the resulting buyer activation email. Do not show secrets, refresh tokens, payment data, MT5 credentials, or a real customer account in the recording.
