# 3S MQL5 Release Archive Review

**Archive reviewed:** `MQL5.rar` supplied by the owner on 19 August 2026. The archive was enumerated and extracted only into an isolated review directory; no EA, script, or package content was executed.

## Archive structure observed

| Path | Review result |
|---|---|
| `MQL5/Experts/3SUniversalEA_customer_license.ex5` | Present; 196,918 bytes. Appears to be the license-activation EA. |
| `MQL5/Experts/3SUniversalEA_customer_preset.ex5` | Present; 197,104 bytes. Its customer role relative to the license EA must be clarified before delivery. |
| `MQL5/Experts/3SUniversalEA_customer_preset.set` | Present; 727 bytes. This should be described as an optional preset and linked to the matching EA. |
| `MQL5/Indicators/*.ex5` | Five supporting indicators are present: 3S Basket Dashboard, 3S Matrix Dashboard, 3STradaysNewsCalendar, DT3-ZigZag-LauerX, and FMCBR-Fractal_fixed. |
| `MQL5/Images/fizu_logo.bmp` | **Invalid in the supplied archive.** The RAR extractor reported an integrity-read failure and produced a zero-byte file. Do not publish this archive unchanged. |
| `MQL5/JAson/JAson.mqh` | Present; 31,322 bytes. An `.mqh` source header is normally a compile-time dependency, not a runtime dependency of an `.ex5`; retain it only if the release instructions explicitly require customer source access. |
| Customer instruction file | Supplied separately as `LICENSE_INSTALLATION.txt`, not embedded in the archive. It should be added to the final protected customer package. |

## Master Server activation compatibility

The supplied `MasterServer_customer_fulfillment.py` implements `POST /license/activate`. It requires the EA to send JSON fields `license_id`, `activation_code`, and `account_number`; it can optionally record an `install_id`. A valid one-time code is consumed and exchanged for a customer-specific API key. This matches the installation guide’s `License_ID`, `License_Activation_Code`, and `License_Account_Number` inputs.

| Requirement | Current review finding |
|---|---|
| Public activation URL | The customer guide still contains the placeholder `https://YOUR-DOMAIN/license/activate`. It must be replaced with the active HTTPS Master Server URL before customer delivery. |
| License issuance | The supplied fulfillment server can issue 3S licenses through its own customer-order or admin-license flow. The current portal’s verified receipt-claim and MT5-bind flow is a separate implementation and does not yet create the supplied server’s one-time 3S activation codes. |
| EA runtime endpoints | The guide refers to `mln_predict` and `mln_feedback`; validate the exact compiled-EA endpoint names against the deployed Master Server before publishing. |
| Packaging | The final update should include the customer instruction file, exact version/release notes, and only files required by the selected `customer_license` or `customer_preset` delivery mode. |

## Blocking items before protected-library testing

1. Re-upload the archive as a ZIP, or replace the corrupt `MQL5/Images/fizu_logo.bmp` in the RAR.
2. Confirm whether customers should install **one** of the two 3S Expert Advisors or both, and which preset belongs to which EA.
3. Provide the release version and identify whether this package replaces the current 3S library or is a separate license-activation pilot.
4. Confirm the deployed public HTTPS base URL for the new `POST /license/activate` service and the exact runtime endpoints expected by the compiled EA.

> No portal-library upload, customer e-mail, payment, entitlement, or Master Server state change was made during this review.
