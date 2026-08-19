# Checklist Reconciliation — 19 August 2026

## Purpose

This note closes historic delivery-list entries without implying that unselected payment experiments are live production features. The selected buyer path remains the two permanent ToyyibPay bills, authenticated receipt claim, MT5 binding, and entitlement-gated package delivery.

| Classification | Checklist entries | Resolution |
|---|---:|---|
| Completed and evidenced | 48–49, 52–54, 85–86, 101–102, 106–107, 115–116 | The isolated RM1 permanent-bill fallback was paid, claimed, bound, re-bound, denied on the old account, authorized on the replacement account, and delivered only its protected test receipt. See `RM1_LIVE_TEST_EVIDENCE.md` and `docs/evidence/`. |
| Dynamic-bill experiment deferred | 21–23, 31, 47, 55–58, 61, 64, 87–88 | API-created callback-enabled bills are not part of the selected buyer route. They remain a separately authorized future experiment; the portal must not represent them as live-verified settlement automation. |
| Sandbox path not selected | 50–51 | The owner elected a real isolated RM1 permanent-bill test rather than ToyyibPay sandbox. No sandbox configuration is required for the selected production route. |
| Replaced by permanent-bill fallback | 55, 64, 85, 87–88 | The controlled permanent `TEST-Gemini-Bot-EA` receipt-claim fallback provided a deterministic, test-only path when dynamic bill creation was unreliable. |
| Runtime/operator acceptance check | 35–37, 39, 62, 108–112 | These concern a user session, external payment page, or VPS/ngrok process. They are retained as operating checks rather than code deliverables. Later successful RM1 binding/re-binding and protected delivery evidence superseded the transient tunnel diagnostics. |
| Parsing diagnostic resolved or no longer required | 91–92 | The portal added fail-closed, sanitized transaction parsing and a structural response signature. The successful permanent-bill fallback claim removed the need to repeat the stale runtime-only diagnostic. |

## Operating safeguards

The owner should perform the on-demand checks after material third-party changes, such as a ToyyibPay bill update, a Master Server restart, an ngrok URL change, or a package release upload. Before a real production payment is relied upon, confirm the permanent bill destination, use a buyer account with the checkout e-mail, verify the settlement reference, bind the intended MT5 account, and confirm the active product library exposes only its authorized files.

## On-demand operating runbook

| Trigger | Operator check | Pass condition |
|---|---|---|
| EA package release | Sign in as the designated administrator, open the portal, and confirm that the **Owner-only release desk** is visible before uploading a versioned `.ex5` file. | The release desk is visible only to the administrator; the uploaded file appears only in the selected active product library. |
| ToyyibPay bill change | From a signed-out browser session, open the portal and select each **Pay securely** control without submitting payment. | Gemini opens `t1rvxbft` and 3S opens `3-Serangkai-EA`; the portal does not show a JSON parsing message. |
| Checkout regression investigation | Use browser developer tools while opening a permanent checkout link and inspect requests made by the portal. | No former tRPC checkout-creation mutation is sent; the browser follows the configured permanent ToyyibPay link. |
| Master Server or ngrok restart | On the VPS, verify the port-5000 listener first, then use the public ngrok endpoint with the required warning-skip header for a harmless unauthenticated protected POST. | The local listener responds and the public protected route responds promptly with an authorization or validation response, not a timeout. Do not enter private keys into browser tools or this runbook. |
| Entitlement visibility before MT5 binding | After a successful permanent-bill receipt claim and before selecting **Activate MT5**, sign in with the checkout e-mail, select **Refresh access**, and capture a redacted portal view of the product card. | The card is visible in **Your eligible downloads**, displays **Access active**, and shows the unbound-account prompt. If it is absent, retain the receipt reference and timestamp, then compare the signed-in e-mail, bill code, amount, paid status, and entitlement record before attempting a binding. |

The public portal link for customers and buyer-email templates is `https://fizuxea-jxctlods.manus.space/portal#installation-guide`.

> The deferred API-created dynamic-bill callback sequence has code and diagnostic coverage, but it is **not** an asserted production capability. It requires a new isolated, owner-authorized payment test before any operational claim can change.
