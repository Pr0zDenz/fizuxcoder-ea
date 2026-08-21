# 3S Protected Library Rollback Inventory — 2026-08-22

## Scope and restoration boundary

This is the pre-replacement inventory of every 3S product-file record present in the protected library before publication of the validated `3SUniversalEA-MQL5.zip` release. It is a rollback record, not a customer download list.

The storage layer does not expose destructive deletion. Removing a `productFiles` database record only hides that object from the customer library; the storage key listed below remains the restoration reference. To roll back, reinsert the listed metadata rows only after removing the replacement rows and verifying that their storage keys still resolve.

| Legacy file ID | Display name | File name | Storage key | Recorded UTC |
|---:|---|---|---|---|
| 4 | 3S Universal EA | `3SUniversalEA.ex5` | `protected-packages/3s-universal-ea/85df8ec8b194-3SUniversalEA_e1276dff.ex5` | 2026-08-13T10:57:15Z |
| 5 | DT3 ZigZag LauerX | `DT3-ZigZag-LauerX.ex5` | `protected-packages/3s-universal-ea/669fdc656cf8-DT3-ZigZag-LauerX_878d8e0f.ex5` | 2026-08-13T10:57:16Z |
| 6 | 3S Basket Dashboard | `3SBasketDashboard.ex5` | `protected-packages/3s-universal-ea/5722cceac3e7-3SBasketDashboard_e3867225.ex5` | 2026-08-13T10:57:17Z |
| 7 | 3S Matrix Dashboard | `3SMatrixDashboard.ex5` | `protected-packages/3s-universal-ea/5f9d8fa78a0c-3SMatrixDashboard_4b021c60.ex5` | 2026-08-13T10:57:18Z |
| 8 | 3S Tradays News Calendar | `3STradaysNewsCalendar.ex5` | `protected-packages/3s-universal-ea/10e83ce412fb-3STradaysNewsCalendar_5bb55a8c.ex5` | 2026-08-13T10:57:19Z |
| 9 | Trade History | `TradeHistory.ex5` | `protected-packages/3s-universal-ea/9af796ae64a7-TradeHistory_29710287.ex5` | 2026-08-13T10:57:21Z |
| 10 | FMCBR Fractal | `FMCBR-Fractal.ex5` | `protected-packages/3s-universal-ea/ff8eb7c04773-FMCBR-Fractal_4f45f82f.ex5` | 2026-08-13T10:57:22Z |
| 90001 | MQL5.rar | `MQL5.rar` | `protected-packages/3s-universal-ea/dddc4443a88e-MQL5_cf1db300.rar` | 2026-08-21T16:43:48Z |
| 90002 | LICENSE INSTALLATION.txt | `LICENSE_INSTALLATION.txt` | `protected-packages/3s-universal-ea/eaf47e318e19-LICENSE_INSTALLATION_7f9370fe.txt` | 2026-08-21T16:44:07Z |

## Controlled replacement plan

The customer library will expose only the validated 3S ZIP archive and its current README companion after publication. The legacy records above will be removed from the live library in one database operation **only after** the new stored objects and metadata are confirmed. This avoids mixed-release dependency files, stale RAR distribution, and conflicting installation instructions.

> Rollback must restore the complete legacy metadata set as a coherent release. Do not mix selected legacy individual files with the new complete 3S archive.
