# 3S Serangkai UNIVERSAL EA — Customer Installation and Activation Guide

## Purpose and licence model

This guide explains the customer setup for **3S Serangkai UNIVERSAL EA**. Your protected download entitlement is a **lifetime product entitlement** in the FizuxCoder Customer Portal. The EA’s connection to the Master Server uses a separate **one-year API licence**. Before that API term expires, contact FizuxCoder support for renewal assistance; renewing the API licence does not remove your portal download entitlement.

> Trading software does not guarantee returns. Test every release on a demo account, verify broker-specific symbol names and execution conditions, and use risk settings appropriate to your own account.

| Component | Required action |
|---|---|
| Portal access | Sign in using the same e-mail address used at ToyyibPay checkout, then verify the successful settlement reference. |
| Protected package | Download the current 3S release only from the active portal library. |
| MT5 account | Enter the numeric MT5 account in the portal. This creates the initial one-year Master Server API licence. |
| Activation e-mail | The registered e-mail receives a **License ID**, one-time activation code, authorized MT5 account number, and API expiry date. |
| Master Server | Add `https://signal.fizuxc0der.uk` to MT5’s allowed WebRequest list. |

## 1. Verify your purchase and obtain activation details

Sign in at the [FizuxCoder Customer Portal](https://fizuxea-jxctlods.manus.space/portal). In **Your eligible downloads**, select **3S Serangkai UNIVERSAL EA**, enter your ToyyibPay invoice or settlement reference, and select **Verify receipt**. The receipt must belong to the signed-in e-mail address.

When the 3S library card shows **Access active**, enter the numeric MT5 account that will run 3S and select **Activate MT5**. The portal issues one initial 3S Master Server API licence for that account and sends the one-time activation details to the registered e-mail address. Do not repeatedly submit a different account number. A 3S account replacement needs support assistance so the prior API licence can be retired safely.

## 2. Install the package in MT5

In MetaTrader 5, select **File → Open Data Folder**. Close MT5 before copying files, then extract the package so the supplied folder layout remains unchanged.

| Archive location | Customer destination |
|---|---|
| `MQL5/Experts/3SUniversalEA_customer_license.ex5` | `MQL5/Experts/` |
| `MQL5/Experts/3SUniversalEA_customer_preset.set` | Keep in `MQL5/Experts/` or another location you can select when loading inputs. |
| `MQL5/Indicators/3S Basket Dashboard.ex5` | `MQL5/Indicators/` |
| `MQL5/Indicators/3S Matrix Dashboard.ex5` | `MQL5/Indicators/` |
| `MQL5/Indicators/3STradaysNewsCalendar.ex5` | `MQL5/Indicators/` |
| `MQL5/Indicators/DT3-ZigZag-LauerX.ex5` | `MQL5/Indicators/` |
| `MQL5/Indicators/FMCBR-Fractal_fixed.ex5` | `MQL5/Indicators/` |
| `MQL5/Images/fizu_logo.bmp` | `MQL5/Images/` |
| `MQL5/Include/JAson/JAson.mqh` | `MQL5/Include/JAson/` |

Restart MT5 after copying the files. From the Navigator panel, attach **3SUniversalEA_customer_license** to the intended chart. Load `3SUniversalEA_customer_preset.set` through the EA Inputs tab. The preset is intended for the supplied MLN prediction and related 3S runtime settings; change it only after you have recorded the original values.

## 3. Permit the EA’s secure Master Server connection

Open **Tools → Options → Expert Advisors** in MT5. Enable **Allow WebRequest for listed URL**, add the exact base URL below, and save the change.

```text
https://signal.fizuxc0der.uk
```

The EA uses this connection for its one-time `/license/activate` request and its permitted MLN prediction and feedback services. Gmail is **not** part of the EA configuration. Gmail is used separately by the portal to send your payment and activation notices.

## 4. Complete one-time activation

Use the values sent to your registered e-mail exactly once:

1. Enter the **License ID**.
2. Enter the **one-time activation code**.
3. Confirm the **authorized MT5 account number** matches the account selected in the portal.
4. Activate the EA while MT5 is connected to the internet.

After a successful response, the EA stores its returned customer-specific API key locally for its permitted service connection. Never send the one-time code, customer API key, Master Server key, broker password, or payment details to another person.

## 5. Updates, renewal, and support

Download 3S updates only from the active portal library. Before replacing the EA file, close the running 3S chart instance. Replace only the files named in the release note, restart MT5, and retest on demo before live use.

Your portal download entitlement remains lifetime. The Master Server API licence expires after one year. Contact FizuxCoder support before expiry with your portal e-mail and MT5 account number. For an account change, contact support before entering a new account in the portal; self-service replacement is intentionally blocked for 3S until the old one-time licence can be retired safely.

## Troubleshooting

| Symptom | Safe first check |
|---|---|
| EA does not appear in Navigator | Confirm `3SUniversalEA_customer_license.ex5` is in `MQL5/Experts/`, then restart MT5. |
| Missing indicator or dashboard | Confirm every listed `.ex5` indicator is in `MQL5/Indicators/`. |
| Activation request fails | Confirm the exact WebRequest base URL is allowed and the entered account matches the portal-bound account. |
| One-time code does not work | Do not retry with another account. Keep the error message and contact support. |
| No activation e-mail | Check the e-mail address used for checkout, spam folders, and then contact support with the verified settlement reference. |

## References

[1]: https://fizuxea-jxctlods.manus.space/portal "FizuxCoder Customer Portal"
[2]: https://signal.fizuxc0der.uk "FizuxCoder 3S Master Server base URL"
