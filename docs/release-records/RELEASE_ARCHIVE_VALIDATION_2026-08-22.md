# Validated Customer Release Archives — 2026-08-22

## Validation outcome

Both submitted ZIP archives passed a non-executing `unzip -t` integrity test. Their paths are relative, retain the expected `MQL5/` root, and contain no traversal segments. The two `fizu_logo.bmp` files decode as Windows 3.x 80 × 80, 24-bit bitmap images. The compiled `.ex5` files were treated as opaque customer binaries; they were **not** executed or decompiled.

| Product | Archive | SHA-256 | Integrity | Release decision |
|---|---|---|---|---|
| Gemini Bot EA v11.97 | `pasted_file_of9cKt_GeminiBotEA-MQL5.zip` | `9a1378122de32bf545a797c5deea41d24b1d658f56c67785d635597a34effb16` | `unzip -t`: pass | Approved as the compiled release archive; publish with the controlled Gemini customer README companion file. |
| 3S Serangkai UNIVERSAL EA | `pasted_file_zefERJ_3SUniversalEA-MQL5.zip` | `b9388896e42f85c7b77874f4b1bfe16503a0db07db638a0466b9e3a64cbf715c` | `unzip -t`: pass | Approved as the complete replacement release archive; publish with the controlled 3S customer README companion file. |

## Gemini Bot EA v11.97 package contents

| Archive path | Expected role |
|---|---|
| `MQL5/Experts/GeminiBotEAv11.97.ex5` | Gemini Bot compiled Expert Advisor |
| `MQL5/Indicators/FizuxCoder_News_Calendar_v5.00_Tradays.ex5` | Required calendar indicator |
| `MQL5/Indicators/FMCBR - Fractal_fixed.ex5` | Required fractal indicator |
| `MQL5/Images/fizu_logo.bmp` | EA image asset |
| `MQL5/Include/JAson/JAson.mqh` | Included library component |

## 3S Serangkai UNIVERSAL EA package contents

| Archive path | Expected role |
|---|---|
| `MQL5/Experts/3SUniversalEA_customer_license.ex5` | Customer licence-enabled 3S EA |
| `MQL5/Experts/3SUniversalEA_customer_preset.set` | Supplied MLN preset |
| `MQL5/Indicators/3S Basket Dashboard.ex5` | Required 3S dashboard indicator |
| `MQL5/Indicators/3S Matrix Dashboard.ex5` | Required 3S dashboard indicator |
| `MQL5/Indicators/3STradaysNewsCalendar.ex5` | Required 3S calendar indicator |
| `MQL5/Indicators/DT3-ZigZag-LauerX.ex5` | Required 3S indicator |
| `MQL5/Indicators/FMCBR-Fractal_fixed.ex5` | Required 3S fractal indicator |
| `MQL5/Images/fizu_logo.bmp` | EA image asset |
| `MQL5/Include/JAson/JAson.mqh` | Included library component |

## 3S endpoint verification

The supplied preset points only to the confirmed HTTPS Master Server base URL:

```text
MLN_Predict_URL=https://ruby-railroad-trimester.ngrok-free.dev/mln_predict
MLN_Feedback_URL=https://ruby-railroad-trimester.ngrok-free.dev/mln_feedback
License_Activate_URL=https://ruby-railroad-trimester.ngrok-free.dev/license/activate
```

The ZIP archives contain no standalone customer instruction file. The final protected library release therefore includes the version-controlled product-specific README as a separate companion download. This ensures that the installation and security guidance is available without modifying, recompiling, or repackaging the validated compiled EA binaries.

## Validation limits

This review verifies ZIP integrity, safe archive paths, declared release structure, readable preset endpoints, and logo-file format. It does not establish trading performance, broker compatibility, MetaTrader compilation provenance, or the runtime behavior of opaque `.ex5` binaries.

## References

[1]: https://fizuxea-jxctlods.manus.space/portal "FizuxCoder Customer Portal"
[2]: https://ruby-railroad-trimester.ngrok-free.dev "Confirmed FizuxCoder Master Server base URL"
