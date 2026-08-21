# Gemini Bot EA v11.97 — Customer Installation and Licence Guide

## Purpose and access model

This guide explains the customer setup for **Gemini Bot EA v11.97**. Gemini access follows the monthly entitlement shown in your verified portal library. Your Gmail payment notice directs you to the portal; it does not activate the EA by itself. The portal verifies the settlement reference, binds your MT5 account, and synchronizes that account to the Master Server.

> Trading software does not guarantee returns. Test the EA on a demo account before live trading and use settings that match your own risk limits, broker conditions, and account size.

| Component | Required action |
|---|---|
| Portal access | Sign in with the same e-mail used at ToyyibPay checkout and verify the successful settlement reference. |
| Protected package | Download the current Gemini release only from the active portal library. |
| MT5 account | Bind the numeric MT5 account that will run Gemini. A later portal rebind replaces the earlier Gemini account. |
| Master Server | Add `https://ruby-railroad-trimester.ngrok-free.dev` to MT5’s allowed WebRequest list. |
| Licence check | Gemini requests `/config` with its account number and chart symbol; the Master Server returns authorized or locked status. |

## 1. Verify your purchase and bind the MT5 account

Sign in at the [FizuxCoder Customer Portal](https://fizuxea-jxctlods.manus.space/portal). Under **Your eligible downloads**, select **Gemini Bot EA v11.97**, enter the ToyyibPay invoice or settlement reference, and select **Verify receipt**. The receipt e-mail must match the signed-in portal account.

When **Access active** appears, enter the numeric MT5 account that will run Gemini and select **Activate MT5**. A later account replacement in the portal removes the previous Gemini account from the Master Server licence record.

## 2. Install the package in MT5

In MetaTrader 5, select **File → Open Data Folder**. Close MT5 before copying files, then place the release components as follows.

| Archive location | Customer destination |
|---|---|
| `MQL5/Experts/GeminiBotEAv11.97.ex5` | `MQL5/Experts/` |
| `MQL5/Indicators/FizuxCoder_News_Calendar_v5.00_Tradays.ex5` | `MQL5/Indicators/` |
| `MQL5/Indicators/FMCBR - Fractal_fixed.ex5` | `MQL5/Indicators/` |
| `MQL5/Images/fizu_logo.bmp` | `MQL5/Images/` |
| `MQL5/Include/JAson/JAson.mqh` | `MQL5/Include/JAson/` |

Restart MT5. In Navigator, attach **GeminiBotEAv11.97** to the intended chart and confirm **Algo Trading** is enabled. Do not use the development source file as a customer release; customers should receive the compiled `.ex5` package only.

## 3. Permit the Master Server connection

Open **Tools → Options → Expert Advisors**. Enable **Allow WebRequest for listed URL**, add the exact URL below, and save the change.

```text
https://ruby-railroad-trimester.ngrok-free.dev
```

Gemini uses this connection to request its `/config` licence and configuration response with the bound MT5 account and chart symbol. Gmail is not configured inside the EA; it is used separately for post-payment portal notices.

## 4. Confirm licence status and keep access current

With the EA attached and MT5 online, Gemini should receive an authorized configuration response for the account you bound in the portal. If the Master Server reports a locked or unauthorized account, confirm that the numeric account matches the portal library card and that the current monthly entitlement is active. Do not share broker passwords, Master Server keys, portal credentials, or payment information.

## 5. Updates and troubleshooting

Download updates only from the active portal library. Close the running Gemini chart before replacing the main EA or listed indicator files. Restart MT5 and test on demo before returning to live use.

| Symptom | Safe first check |
|---|---|
| Gemini is absent from Navigator | Confirm `GeminiBotEAv11.97.ex5` is in `MQL5/Experts/`, then restart MT5. |
| Missing calendar or fractal dependency | Confirm the named `.ex5` files are in `MQL5/Indicators/`. |
| Locked or unauthorized server status | Verify the portal-bound MT5 account, the active monthly entitlement, and the allowed WebRequest base URL. |
| Need to change MT5 account | Use the portal account replacement control; the previous Gemini account is removed. |
| No post-payment e-mail | Check the checkout e-mail and spam folders, then sign in to the portal directly to verify the receipt. |

## References

[1]: https://fizuxea-jxctlods.manus.space/portal "FizuxCoder Customer Portal"
[2]: https://ruby-railroad-trimester.ngrok-free.dev "FizuxCoder Master Server base URL"
