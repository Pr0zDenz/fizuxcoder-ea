# EA Release Upload and Versioning Procedure

## Release principle

Use the owner-only **Add a protected package file** desk in the Customer Portal to upload every customer-deliverable `.ex5` file. Files are stored in protected storage and are visible only to customers with an active entitlement for the selected product.

> Do **not** upload EA packages through public links, chat attachments, or the website’s public assets. Use the owner-only release desk so the portal continues to enforce entitlement checks and short-lived signed downloads.

## Recommended file naming

Use a new, explicit versioned filename for every main EA release. Do not re-use the exact old filename for a materially changed EA build.

| File type | Recommended naming | Example |
|---|---|---|
| Main EA | `<Product>_v<major>.<minor>.ex5` | `GeminiBotEA_v11.98.ex5` |
| Main 3S EA | `<Product>_v<major>.<minor>.ex5` | `3SUniversalEA_v13.86.ex5` |
| Supporting component | `<Component>_v<major>.<minor>.ex5` when updated | `FMCBR-Fractal_v2.01.ex5` |
| Hotfix | Append a short hotfix label only when needed | `GeminiBotEA_v11.98_HF1.ex5` |

Using a versioned name makes it clear to the customer which file is new and preserves auditability. The current release desk **adds** a protected file; it does not overwrite or remove an older library entry automatically. Therefore, do not upload a new build under exactly the same filename unless you intentionally want two indistinguishable entries in the customer library.

## Upload workflow

| Step | Owner action |
|---|---|
| 1 | Compile and test the new EA or indicator in MT5 before uploading. Keep the prior release available until the replacement has been checked. |
| 2 | Decide the product library: **Gemini Bot EA** or **3 Serangkai UNIVERSAL EA**. Never place one product’s files in the other product library. |
| 3 | Rename the deliverable using the recommended version convention. |
| 4 | Sign in as `xtr0zen@gmail.com`, open the portal, and go to **Owner-only release desk**. |
| 5 | Select the correct product library, choose the `.ex5` file, and upload it. |
| 6 | Confirm the filename appears in the intended product library. Use an active, authorized test account to confirm the new file produces a signed download. |
| 7 | Send the update e-mail template to active customers and specify whether they must replace, retain, or remove the prior version. |

## Recommended update policy

For a main-EA replacement, upload the new version with a new filename, notify customers, and tell them not to run both main EA versions on the same account and symbol. Keep the previous build available during a short rollback window unless there is a security or operational reason to withdraw it. If an old file must be removed from customer visibility, use an owner-approved release-management change rather than deleting storage objects manually.

## Release checklist

- [ ] Main EA and all updated supporting `.ex5` components compile and initialize as expected in MT5.
- [ ] Version number and filename match the customer release notes.
- [ ] Correct product library is selected before upload.
- [ ] Package is downloaded through an active entitlement test, not a public URL.
- [ ] Update e-mail identifies the new filename and safe replacement steps.
- [ ] The release is tested on demo before customer live use is encouraged.
