# PW-3 · GitHub's image proxy refreshes the widgets

status: proposed
cap: 60 min
sources: the requester's message in the session (text, no Jira card); curl of the lab's response headers
not_read: none (no attachments or links)

## Specs

- S1 · "ya se actualiza mi readme?"
- PW-3-ASM-01 · a 200 widget answers `Cache-Control: public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400`, so GitHub's image proxy refetches at most every 30 minutes while Vercel's edge keeps serving from cache · S1

## Tasks

- T1 · S1, PW-3-ASM-01 · src/modules/widgets/presentation/respond.mjs (presentation), test/api-camo.test.mjs · tests: test/api-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"; test/api-camo.test.mjs "a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-3-ASM-01 @PW-1-ASM-07"
  reuses: src/modules/widgets/presentation/respond.mjs EDGE_CACHE

## Changes to existing behavior

- every 200 widget answer gains `max-age=1800` in its Cache-Control: test/api.test.mjs "a widget answers an SVG cached at the edge for 1800 s and stale for 86400 s @PW-1-S2 @PW-1-ASM-03" and test/api-errors.test.mjs "a 404 is cached for 300 s @PW-1-ASM-07" assert the old exact header and are replaced by test/api-camo.test.mjs
- the 404 (`max-age=300`) and the 503/500 (`no-store`) answers do not change

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/presentation/respond.mjs
mutate src/modules/widgets/presentation/respond.mjs: node --test --test-force-exit test/api.test.mjs test/api-errors.test.mjs test/api-camo.test.mjs
refactor-tests: the two frozen tests assert the old exact Cache-Control header, which this card contradicts; their replacements in test/api-camo.test.mjs carry their tags, and the old tests are removed from their files
no-visual: the widgets are SVG images with no screen; the card changes a response header only
no-docs: only a response header changes
```

- declared · fault-db · no database
- declared · mutate · scripts/dev.mjs · the local server of the gate, not shipped

## Look

plain: no screen; the card changes a response header

## Log

- L1 · ya se actualiza mi readme?
- L2 · context · the profile README now loads the widgets from https://lab.nawi.dev/api/profile/<name>.svg through GitHub's image proxy (camo). Vercel strips `s-maxage` from what it sends to clients, so the response reaching camo says only `Cache-Control: public` (verified with curl), and camo has no expiry to follow.
- L3 · 2026-11-11 · replaces: test/api.test.mjs "a widget answers an SVG cached at the edge for 1800 s and stale for 86400 s @PW-1-S2 @PW-1-ASM-03" · asserts the exact header without max-age · by: test/api-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"
- L4 · 2026-11-11 · replaces: test/api-errors.test.mjs "a 404 is cached for 300 s @PW-1-ASM-07" · asserts the exact 200 header without max-age · by: test/api-camo.test.mjs "a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-3-ASM-01 @PW-1-ASM-07"
