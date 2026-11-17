# PW-11 · Contributions since the account began

status: proposed
cap: 90 min
sources: the requester's message in the session (text, no Jira card); GitHub's public contributions page, which takes `?from=YYYY-01-01&to=YYYY-12-31` and heads each year with "N contributions in YYYY" (measured on 2026-11-17 for NahuelMosse: 1 in 2017, 0 from 2018 to 2021, 239 in 2022, 907 in 2023, 125 in 2024, 85 in 2025, 7,502 in 2026, 8,859 in all); the account's creation date in GitHub's public REST `/users/NahuelMosse` (2017-07-16)
not_read: none (no attachments or links)

## Specs

- S1 · "se puede hacer que contributions sume las contribuciones de toda mi historia en gh, no solo la de los ultimos 12 meses?"
- PW-11-ASM-01 · "contributions" is the skyline's big number: it becomes the sum of every calendar year from the year the account was created to the current one, labelled `CONTRIBUTIONS SINCE <year>`; the prisms, the heatmap and the streak keep the last 12 months · S1
- PW-11-ASM-02 · each year's count is the total GitHub's public contributions page writes in that year's heading ("N contributions in YYYY"), read with no token, as PW-7 reads the last year; the creation year comes from GitHub's public REST user, with the token as its fallback · S1
- PW-11-ASM-03 · when a year's page fails or no longer carries that heading, every year is asked of GitHub's GraphQL with the token, as the calendar falls back; when that fails too, the skyline answers 503 with Retry-After 300 · S1

## Tasks

- T1 · S1, PW-11-ASM-02 · src/modules/widgets/domain/contributions-page.mjs (rule), test/lifetime-contributions.test.mjs, test/fixtures/github-contributions-2023.json · tests: test/lifetime-contributions.test.mjs "a year's page gives the total its heading writes, and nothing else @PW-11-S1 @PW-11-ASM-02"
  reuses: src/modules/widgets/domain/contributions-page.mjs parseContributionsPage (its COUNT pattern for the number)
- T2 · S1, PW-11-ASM-01, PW-11-ASM-02, PW-11-ASM-03 · src/modules/widgets/data/github.mjs (data), src/modules/widgets/domain/draw.mjs (rule), src/modules/widgets/presentation/respond.mjs (presentation), test/lifetime-contributions.test.mjs, test/support/stub-fetch.mjs, test/support/public-fetch.mjs, test/support/recorded-widgets.mjs, test/fixtures/github-profile.json, test/fixtures/github-contribution-years.json, test/golden-v3/skyline.dark.svg, test/golden-v3/skyline.light.svg · tests: test/lifetime-contributions.test.mjs "the skyline sums every year since the account began, read from the public pages with no token @PW-11-S1 @PW-11-ASM-01 @PW-11-ASM-02"; test/lifetime-contributions.test.mjs "a year the public page does not give is asked of GraphQL with the token, and both failing is a 503 with Retry-After 300 @PW-11-ASM-03"
  reuses: src/modules/widgets/data/github.mjs publicFirst, publicRest, graphql, profileUser; src/modules/widgets/domain/draw.mjs drawSkyline, fmt
- T3 · PW-11-S1 · test/api-public-camo-lifetime.test.mjs · tests: test/api-public-camo-lifetime.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-11-S1 @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"

## Changes to existing behavior

- GET /api/profile/skyline.svg · its big number is the sum since the account's creation year, labelled `CONTRIBUTIONS SINCE <year>`, and it asks the public REST user and one contributions page per year besides the last year's · test/api-public-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" lists the skyline's requests as the last year's page only: replaced by test/api-public-camo-lifetime.test.mjs and removed
- test/golden-v3/skyline.{dark,light}.svg · drawn with the sum since 2017 from the recorded year totals

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/domain/contributions-page.mjs src/modules/widgets/data/github.mjs src/modules/widgets/domain/draw.mjs src/modules/widgets/presentation/respond.mjs test/lifetime-contributions.test.mjs test/api-public-camo-lifetime.test.mjs
mutate src/modules/widgets/domain/contributions-page.mjs: node --test --test-force-exit test/lifetime-contributions.test.mjs test/contributions-page.test.mjs
mutate src/modules/widgets/data/github.mjs: node --test --test-force-exit test/lifetime-contributions.test.mjs test/public-first.test.mjs
mutate src/modules/widgets/domain/draw.mjs: node --test --test-force-exit test/lifetime-contributions.test.mjs test/widgets-aligned.test.mjs test/widgets-aligned-limits.test.mjs test/widgets-views.test.mjs
mutate src/modules/widgets/presentation/respond.mjs: node --test --test-force-exit test/lifetime-contributions.test.mjs test/api-aligned.test.mjs test/views.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: PW-7's camo test lists each widget's requests, the skyline's as the last year's page only; the requester asks for every year, so its replacement carries its tags with the skyline's year pages and the old test is removed
no-visual: the skyline keeps its drawing; only its number and the label under it change, checked by the golden files; this repository has no screen
```

- declared · fault-db · no database: the years come from GitHub, whose failure test/lifetime-contributions.test.mjs injects

## Look

plain: no screen; the skyline keeps its drawing, its big number reads the sum and the label under it `CONTRIBUTIONS SINCE <year>`

## Log

- L1 · se puede hacer que contributions sume las contribuciones de toda mi historia en gh, no solo la de los ultimos 12 meses? · hacelo
- L2 · 2026-11-17 · replaces: test/api-public-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" · it lists the skyline's requests as the last year's page only · by: test/api-public-camo-lifetime.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-11-S1 @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"
