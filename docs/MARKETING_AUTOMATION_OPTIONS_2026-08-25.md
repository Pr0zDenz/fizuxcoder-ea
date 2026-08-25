# FizuxCoder Marketing Automation Options

> **Approval boundary.** This document designs automation; it does not authorize publishing, direct messages, campaign creation, or advertising spend. Every public post and every paid-media change must remain owner-approved.

## Current integration finding

The current workspace configuration does not show an enabled Threads or Meta advertising connector. A Threads reference found in configuration belonged to an unrelated email product, not the Meta social network. No connector will be enabled or credential will be requested until the owner selects an automation route.

Meta documents a direct Threads API that can create and publish text, image, video, and carousel posts. Publishing uses an authenticated Meta application and a two-step container-and-publish process.[1] Meta also documents a Marketing API for programmatic campaign, ad-set, creative, and reporting operations.[2]

## Decision comparison

| Approach | What runs automatically | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- | --- |
| **A. Approval-gated content studio** | AI prepares content calendar drafts, compliance checks, creative briefs, captions, UTM links, and a weekly report. The owner approves each post, then posts manually in Threads. | Lowest operational and policy risk; no direct social credential in the app. Publishing is not hands-free. | Uses only the existing website and any chosen AI-generation usage. No advertising spend. | Low. |
| **B. Direct Threads publishing workflow** | AI drafts content; the owner approves each item in a dashboard; a scheduled job publishes the approved post to Threads through the official API and records the post ID and results. | Requires a Meta developer app, Threads account authorization, secure OAuth token handling, and platform permissions. An approval gate still prevents accidental or non-compliant posting. | Website hosting plus any Meta/API or AI usage. No automatic ad spending. | Medium. |
| **C. Full social and paid-media operations console** | Adds approved Threads publishing, content reporting, campaign-draft creation, and monitored reporting. Owner must explicitly approve each campaign, budget, audience, and launch. | Highest setup and legal/platform-review burden. Meta’s financial-services/CFD policy makes paid promotion of this EA especially sensitive. Do not automate ad launch or budget changes. | Ongoing platform, AI, and approved media spend; variable. | High. |

## Recommended operating model for selection

Start with **Approach A** for a 14-day organic learning pilot: create a content queue, require an owner check on every caption and visual, and record link clicks and guide engagement. If the owner approves the quality and legal/platform posture, move to **Approach B** for official-API publishing with the same approval gates. Keep **Approach C** deferred until the owner has obtained written Malaysian regulatory advice and Meta eligibility confirmation.

The owner should choose the route; this recommendation is based on the current connector inventory and the policy risk of paid financial/trading promotion, not on any assumption that paid ads are permitted.[3]

## Non-negotiable controls

| Control | Requirement |
| --- | --- |
| Content queue | Each record stores platform, copy, asset URL, product, risk statement, destination URL, language, proposed publish time, and status. |
| Approval | Only `xtr0zen@gmail.com` as administrator may approve, reject, or publish a draft. Approval stores the exact approved content hash and timestamp. |
| Compliance lint | Block drafts containing prohibited language: guaranteed, guaranteed profit, risk-free, passive income, get rich, fixed return, win rate, or unsupported superlatives. Flag—not automatically rewrite—broker/licensing claims. |
| Publication | An approval applies to one immutable content version and one destination. Any change resets the item to draft. |
| Paid media | Campaign setup may generate a **draft specification** only. Budget, targeting, campaign creation, launch, pause, and bid changes require fresh owner confirmation each time. |
| Audit log | Store actor, source asset hash, final caption, UTM URL, approval/rejection, publish response, post ID, and error. Do not store social passwords or personal data in the log. |
| Kill switch | One administrator action pauses all scheduled publishing and revokes future queue execution. |

## Workflow for Approach B

1. The owner creates and configures a Meta developer app for the official Threads API and authorizes the brand Threads account.
2. The app stores credentials as protected server-side secrets; neither the browser nor ordinary customers can access them.
3. An AI-assisted draft job creates a small weekly queue from approved content pillars and approved claims.
4. The administrator reviews each exact caption, asset, link, and scheduled time in the administrator operations area.
5. After approval, the scheduler submits the approved asset URL and caption to the official Threads API, then records the returned post ID.
6. A daily report retrieves basic post outcomes, summarizes comments needing human attention, and never replies automatically to investment, support, licence, or account-binding questions.

Threads supports programmatic post creation and publication, and public image/video asset URLs are required for media posts.[1] Video and image assets should be served from controlled public storage, while EA packages remain inside the protected customer library.

## Paid-campaign guardrail

The Marketing API can manage campaign objects, but it is not a reason to auto-launch paid media.[2] Meta states that it may require financial-services advertisers to verify identity/business information and show regulatory authorization; its policy also prohibits ads promoting CFD trading.[3] Therefore, the system must never create, fund, or enable a Meta campaign unless the owner confirms the exact financial/legal classification, campaign content, destination, audience, daily cap, dates, and stop rule in the same approval event.

## Owner decision required

Choose one of the following before technical implementation:

| Reply | Scope I will implement next |
| --- | --- |
| **A** | A private approval-gated content studio with a two-week Threads calendar, compliance checks, weekly report, and manual Threads posting. |
| **B** | Everything in A, plus official Threads API publishing after the owner creates/authorizes the Meta developer application. |
| **C** | Everything in B, plus a **draft-only** Meta campaign planning console. No ads will launch or incur spend without a separate explicit campaign authorization. |

## References

[1]: https://developers.facebook.com/documentation/threads/posts "Meta for Developers — Threads Posts"
[2]: https://developers.facebook.com/documentation/ads-commerce/marketing-api "Meta for Developers — Marketing API"
[3]: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/financial-services/ "Meta Transparency Center — Financial and Insurance Products and Services"
