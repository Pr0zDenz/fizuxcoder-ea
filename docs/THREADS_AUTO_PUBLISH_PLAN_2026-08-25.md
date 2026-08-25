# Approval-triggered Threads publishing plan

## Confirmed official behavior

Meta’s official Threads Posts documentation states that a single text post uses a two-step flow: create a media container with `POST /{threads-user-id}/threads`, then publish it with `POST /{threads-user-id}/threads_publish`. Text posts are limited to 500 characters, and the publish response returns a Threads media ID. The official documentation recommends waiting on average 30 seconds before publishing a media container so processing can complete. Source: https://developers.facebook.com/documentation/threads/posts.

Meta’s access-token documentation states that the OAuth authorization returns a short-lived Threads user access token and user ID. Source: https://developers.facebook.com/documentation/threads/get-started/get-access-tokens-and-permissions.

Meta’s long-lived-token documentation states that long-lived tokens are valid for 60 days and can be refreshed while unexpired, at least 24 hours old, and while the app user has granted `threads_basic`. Refreshed tokens are valid for another 60 days; expired tokens cannot be refreshed. Source: https://developers.facebook.com/documentation/threads/get-started/long-lived-tokens.

## Proposed boundary

The existing owner OAuth record remains server-side only. The application should publish only the exact caption and asset selected in an already approved private-studio item. Approval must never publish an unapproved draft. The operation should use a database-backed publish-attempt state and idempotency guard, wait for the documented container-processing interval, record the returned external post ID only after successful publication, and retain sanitized provider error metadata on failure. It must not create ads, boost posts, or spend money.

## Open implementation constraints

The current data model is manual-post oriented. It needs explicit states for an in-flight publish attempt and provider failure, plus an audit action that distinguishes API publication from manual attestation. Token refresh should be handled server-side and should fail closed when reauthorization is required. A live post should not be sent during implementation or automated tests.
## Development preview verification

The development preview was checked at 1280 × 720 and 375 × 812 without invoking any mutation. The mobile view rendered the approval-triggered workflow label, connected owner identity, Gemini revision control, preparation control, draft-review count, and automatic-publish explanation legibly. The desktop capture remained on the loading state while the authenticated studio initialized; server health and TypeScript checks were clean. Production verification must still be performed after the next checkpoint and must not include clicking Approve on a live draft unless the owner explicitly names that draft for publication.
