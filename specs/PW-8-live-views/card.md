# PW-8 · Profile views on every view

status: proposed
cap: 60 min
sources: the requester's message in the session (text, no Jira card); the README's views chip as NahuelMosse/NahuelMosse draws it today (scripts/live.mjs, once a day, from komarev.com's badge; assets/live/views.*.svg); komarev.com's badge answers `Cache-Control: max-age=0, no-cache, no-store, must-revalidate` and counts each request
not_read: none (no attachments or links)

## Specs

- S1 · "es que hay cosas que si se actualizan cada 30 mins estan bien"
- S2 · "pero las visitas se deberian actualizar todo el tiempo"
- PW-8-ASM-01 · "all the time" is on every view of the README: the views widget answers `Cache-Control: max-age=0, no-cache, no-store, must-revalidate`, as komarev's own badge does, so GitHub's image proxy asks for it on every view and Vercel keeps no copy · S2
- PW-8-ASM-02 · the views widget is the counter: each request asks komarev.com's badge for the profile user (which counts that view, as the README's invisible pixel does today) and draws its number as the fourth chip of the links row, exactly as the README's chip is drawn today (a quarter of the 1012 px column, 252 × 48) · S2
- PW-8-ASM-03 · when komarev does not answer, answers an error or its badge carries no number, the widget answers 503 with Retry-After 300 and no-store, as any upstream failure · S2
- PW-8-ASM-04 · every other widget keeps its 30-minute cache (`public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400`) · S1

## Tasks

- T1 · S2, PW-8-ASM-02 · src/modules/widgets/domain/draw.mjs (rule), test/widgets-views.test.mjs, test/golden-v3/views.dark.svg, test/golden-v3/views.light.svg · tests: test/widgets-views.test.mjs "views is a live widget, drawn as the fourth chip of the links row, 252 by 48 in the 1012 column @PW-8-S2 @PW-8-ASM-02 @PW-1-ASM-02"
  reuses: src/modules/widgets/domain/draw.mjs slot, slotDocument, fmt (the slot takes the number of images in the row: three, or four for the links row)
- T2 · S1, S2, PW-8-ASM-01, PW-8-ASM-02, PW-8-ASM-03, PW-8-ASM-04 · src/modules/widgets/data/komarev.mjs (data), src/modules/widgets/presentation/respond.mjs (presentation), api/profile/[name].mjs (presentation), test/views.test.mjs, test/support/stub-fetch.mjs, test/support/recorded-widgets.mjs, test/fixtures/komarev-badge.json · tests: test/views.test.mjs "the views widget counts and draws on every request, never cached @PW-8-S2 @PW-8-ASM-01 @PW-8-ASM-02"; test/views.test.mjs "a komarev failure answers 503 with Retry-After 300 @PW-8-ASM-03"; test/views.test.mjs "the other widgets keep their 30-minute cache, max-age 1800 and stale 86400 @PW-8-S1 @PW-8-ASM-04"
  new: no komarev client exists in the repo (Grep komarev in src/ and api/); it follows src/modules/widgets/data/npm.mjs, a public client with no token
  reuses: src/modules/widgets/presentation/respond.mjs WIDGETS (load and draw), unavailable
- T3 · PW-8-S2 · test/api-unknown.test.mjs, test/api-camo-views.test.mjs · tests: test/api-unknown.test.mjs "an unknown widget or theme answers 404 naming the valid ones @PW-8-S2 @PW-1-ASM-04"; test/api-camo-views.test.mjs "a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-8-S2 @PW-7-ASM-04 @PW-3-ASM-01 @PW-1-ASM-07"

## Changes to existing behavior

- GET /api/profile/views.svg · answers the views chip instead of 404 · test/widgets.test.mjs "views is not a live widget @PW-1-ASM-02", test/api.test.mjs "an unknown widget or theme answers 404 naming the valid ones @PW-1-ASM-04" and test/api-camo-offline.test.mjs "a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-7-ASM-04 @PW-3-ASM-01 @PW-1-ASM-07" take views as unknown: replaced by test/widgets-views.test.mjs, test/api-unknown.test.mjs and test/api-camo-views.test.mjs and removed
- the 404 body's list of widgets gains views

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/data/komarev.mjs src/modules/widgets/domain/draw.mjs src/modules/widgets/presentation/respond.mjs test/views.test.mjs test/widgets-views.test.mjs test/api-unknown.test.mjs test/api-camo-views.test.mjs
mutate src/modules/widgets/data/komarev.mjs: node --test --test-force-exit test/views.test.mjs
mutate src/modules/widgets/domain/draw.mjs: node --test --test-force-exit test/widgets-views.test.mjs test/widgets-aligned.test.mjs test/widgets-aligned-limits.test.mjs test/widgets-v2.test.mjs
mutate src/modules/widgets/presentation/respond.mjs: node --test --test-force-exit test/views.test.mjs test/api-aligned.test.mjs test/api-unknown.test.mjs test/api-errors.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: three frozen tests take views as an unknown widget (PW-1-ASM-02 kept it out of the live widgets while the README drew it once a day); the requester now asks for it live, so their replacements carry their tags with views as a widget and the old tests are removed
no-visual: the views chip is drawn exactly as the README draws it today (golden files from the profile's live.mjs); this repository has no screen
```

- declared · mutate · api/profile/[name].mjs · it only adds the komarev fetchers to the ones it passes; test/views.test.mjs reaches the views widget through it
- declared · fault-db · no database: the count comes from komarev.com, whose failure test/views.test.mjs injects

## Look

plain: no screen; the views chip keeps the drawing the README gives it today

## Log

- L1 · es que hay cosas que si se actualizan cada 30 mins estan bien, pero las visitas se deberian actualizar todo el tiempo
- L2 · 2026-11-12 · replaces: test/widgets.test.mjs "views is not a live widget @PW-1-ASM-02" · the requester now asks for the views live · by: test/widgets-views.test.mjs "views is a live widget, drawn as the fourth chip of the links row, 252 by 48 in the 1012 column @PW-8-S2 @PW-8-ASM-02 @PW-1-ASM-02"
- L3 · 2026-11-12 · replaces: test/api.test.mjs "an unknown widget or theme answers 404 naming the valid ones @PW-1-ASM-04" · it takes views as an unknown widget · by: test/api-unknown.test.mjs "an unknown widget or theme answers 404 naming the valid ones @PW-8-S2 @PW-1-ASM-04" (visits is the unknown name)
- L4 · 2026-11-12 · replaces: test/api-camo-offline.test.mjs "a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-7-ASM-04 @PW-3-ASM-01 @PW-1-ASM-07" · it takes views as an unknown widget · by: test/api-camo-views.test.mjs "a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-8-S2 @PW-7-ASM-04 @PW-3-ASM-01 @PW-1-ASM-07" (visits is the unknown name)
