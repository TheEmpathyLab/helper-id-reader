# Helper-ID — Keychain Add-On Scoped and Deferred
**Session date:** 2026-05-17
**Status:** Decision log — ready for repo commit
**Next session entry point:** No active build. Resume when Shelton is ready to add features. Keychain add-on (Option A) is the next scoped feature when that time comes.

## What was decided

- A keychain bundle add-on (3 for $25) is a valid future product offering.
- The right implementation is Option A: dynamic Stripe Checkout Sessions (server-side `/create-checkout` endpoint) so the add-on appears in a single transaction at membership creation — not a post-purchase upsell.
- Stripe already collects mailing address at checkout, so no additional address collection is needed for keychain fulfillment.
- **No new features will be built right now.** Shelton is focusing on selling the current product before augmenting it.

## What was built or designed

Nothing built this session. Architecture scoped only.

## Open questions

| Question | Context | Priority |
|----------|---------|----------|
| Keychain fulfillment notification — internal email or logged to DB? | When someone adds keychains at checkout, Shelton needs to know. Email is simplest; DB log adds queryability. | Before building keychain add-on |

## What was ruled out

- **Option B (post-purchase upsell via second Payment Link):** Creates two separate transactions and a disjointed UX. Option A (single dynamic checkout) is the agreed path when this gets built.
- **Building any new features in this session:** Explicit product decision — sell what exists first.

## May need revisiting

- **Keychain pricing ($25 for 3):** Not locked in formally. Confirm before building the Stripe product.

## Next steps

1. When ready to resume feature work, start with the keychain add-on: build `/create-checkout` endpoint, replace static Payment Links on `membership.html` with a dynamic form, handle keychain line item in the webhook.
2. Issues #73 and #74 remain open for household adult access and member self-service email update.

## Provenance label

```
Provenance Label v1.0
- Human Contribution: 60%
- AI Contribution: 40%
- Collaboration Method: Shelton directed the product question and made all decisions; Claude audited the existing checkout architecture and framed the two implementation options.
- AI Tool(s): Claude Sonnet 4.6 (Anthropic)
- Human Roles: Product ideation, option selection, decision to pause feature development
- AI Roles: Architecture audit (Payment Links vs dynamic checkout), options framing
```
