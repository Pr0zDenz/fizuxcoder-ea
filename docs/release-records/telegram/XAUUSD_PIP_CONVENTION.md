# XAUUSD pip convention for Telegram performance reports

## Decision

For this project’s gold reports, use the owner-confirmed convention: **10 MT5 points = 1 project pip**. Therefore, a displayed movement of 540 points is reported as 54 pips. For a two-decimal XAUUSD quote, this corresponds to 0.10 in price movement per project pip. When the broker symbol has a different number of digits or point size, the report must use the symbol’s live MT5 `SYMBOL_POINT` and digits rather than assume the same conversion.

## Evidence and limitation

Pepperstone describes XAU/USD as a spot-gold CFD and notes that spread measurement and contract conditions apply to the specific instrument and account type, but its public costs page does not establish a universal gold-pip definition. Myfxbook’s XAUUSD calculator uses a 0.01 pip-size convention, demonstrating that third-party conventions can differ. MQL5 community guidance likewise notes that gold pip terminology varies with quote digits and broker contract specifications. Accordingly, the portal should treat the owner’s 10-points-per-pip convention as a project reporting setting, while preserving raw points and prices for auditability.

## Sources

1. Pepperstone, “Costs and fees”: https://pepperstone.com/en/trading/costs-and-fees
2. Myfxbook, “XAUUSD Pip Calculator”: https://www.myfxbook.com/forex-calculators/pip-calculator/XAUUSD
3. MQL5 Forum, “PIPS are killing me”: https://www.mql5.com/en/forum/431426
