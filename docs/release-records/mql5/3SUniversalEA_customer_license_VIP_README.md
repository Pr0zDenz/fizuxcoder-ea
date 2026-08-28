# 3 Serangkai Universal EA VIP

## Customer-safe release

This `_VIP` source is the customer distribution of 3 Serangkai Universal EA. It preserves the EA’s trading workflow, macro and MLN configuration, basket management, Safe TP, stop-loss handling, runtime configuration, and licensing checks.

Internal administration, Telegram signal reporting, marketing screenshot capture/upload, mock/test routes, and owner-only event hooks are not included in this customer build.

## Installation

1. Compile `3SUniversalEA_customer_license_VIP.mq5` in MetaEditor for MetaTrader 5.
2. Copy the compiled `.ex5` file into the terminal’s `MQL5/Experts` folder.
3. Restart MetaTrader 5 or refresh the Navigator panel.
4. Attach the EA to the intended chart and review risk, basket, Safe TP, macro, and MLN inputs before enabling automated trading.
5. Add the vendor’s HTTPS Master Server URL to **Tools → Options → Expert Advisors → Allow WebRequest for listed URL** when runtime configuration or licensing requires it.
6. Enter only the customer license details supplied through the protected portal. Never share license keys or account-bound credentials.

## Operational note

The VIP build does not send Telegram messages or marketing screenshots. Signal reporting and owner-only marketing functions belong to the internal release and are intentionally excluded here.

Trading involves risk. Test on a demo account first, verify broker symbol conventions and execution conditions, and monitor the EA after installation.

## Files

- `3SUniversalEA_customer_license_VIP.mq5` — compile-ready customer source.
- `3SUniversalEA_customer_license_VIP.ex5` — optional compiled binary, if supplied separately.
