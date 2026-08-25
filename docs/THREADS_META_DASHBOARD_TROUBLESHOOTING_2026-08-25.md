# Threads Meta Dashboard OAuth Callback Troubleshooting

## Observed owner-facing save error

The owner entered the deployed FizuxCoder callback, deauthorization, and data-deletion URLs in the **Access the Threads API** use-case settings page. Meta displayed: **“Form can't be saved — Redirect URIs: Please specify an OAuth redirect URI.”**

## Current evidence and safe recovery step

The callback field is a tokenized input in some Meta dashboard versions. After pasting a URL, the operator must select the **Add URL** option that appears beneath the field before pressing Save. A visible text value alone may not have been registered by the form.[1]

The current Meta developer community also contains an unresolved report, posted in August 2026, that reproduces this exact error even after valid HTTPS redirect, deauthorization, and data-deletion URLs are supplied.[2] If selecting the inline **Add URL** option does not create a committed URL item, treat it as a Meta-side dashboard issue rather than altering the deployed FizuxCoder URLs.

## Deployed endpoint values

| Meta field | Value |
|---|---|
| Redirect Callback URLs | `https://fizuxea-jxctlods.manus.space/api/threads/oauth/callback` |
| Uninstall Callback URL | `https://fizuxea-jxctlods.manus.space/api/threads/deauthorize` |
| Delete Callback URL | `https://fizuxea-jxctlods.manus.space/api/threads/data-deletion` |

Do not add a trailing slash, change the domain, add advertising permissions, or use an untrusted alternate callback. The OAuth redirect URI must exactly match the deployed server endpoint.[3]

## References

[1]: https://stackoverflow.com/questions/78924156/threads-meta-api-auth-callback-urls
[2]: https://developers.facebook.com/community/threads/1560049539133006/
[3]: https://developers.facebook.com/documentation/threads/get-started/get-access-tokens-and-permissions
