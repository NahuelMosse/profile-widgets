# PW-12 · The streak since the account began

status: proposed
cap: 90 min
sources: the requester's message in the session (text and a screenshot of the streak widget: `STREAK · LAST 12 MONTHS`, 67 current streak, 67 longest, 192 active days, 208 merged PRs · public repos); GitHub's public contributions page per year (`?from=YYYY-01-01&to=YYYY-12-31`), which lays a cell per day of the whole year, the days after today included with no contributions (measured on 2026-11-26 for NahuelMosse: 365 cells for 2017 and for 2026, 492 days with contributions from 2017 to 2026-11-26); the search query of merged PRs in src/modules/widgets/data/github.mjs, which carries no date
not_read: none (no attachments or links besides the screenshot)

## Specs

- S1 · "igual que hicimos con las contribuciones que sumen de todos los a;os, podemos hacer lo mismo con estos numeros"
- PW-12-ASM-01 · "these numbers" are the streak widget's: its current streak, longest streak and active days count every day from the year the account was created to today, and its title reads `STREAK · SINCE <year>`; merged PRs already counts every merged PR in public repos with no date and stays as it is; the heatmap and the skyline's prisms keep the last 12 months · S1
- PW-12-ASM-02 · the days before the last 12 months come from each year's public contributions page with no token, the pages PW-11 reads, one cell per day; the last 12 months stay the profile's calendar, so today and "today without contributions does not break the current streak" do not change, and a year page's days from the calendar's first day on (the future ones included) are not read again · S1
- PW-12-ASM-03 · when a year's page fails or no longer carries its day cells, every year's days are asked of GitHub's GraphQL with the token, as the calendar falls back; when that fails too, the streak answers 503 with Retry-After 300 · S1

## Tasks

- T1 · S1, PW-12-ASM-01, PW-12-ASM-02 · src/modules/widgets/domain/draw.mjs (rule), test/lifetime-streak.test.mjs · tests: test/lifetime-streak.test.mjs "the streak runs across years into the last 12 months, and a year page's days from the calendar on are not read @PW-12-S1 @PW-12-ASM-01 @PW-12-ASM-02"
  reuses: src/modules/widgets/domain/draw.mjs drawStreak, streaks, daysOf, title
- T2 · S1, PW-12-ASM-01, PW-12-ASM-02, PW-12-ASM-03 · src/modules/widgets/data/github.mjs (data), src/modules/widgets/presentation/respond.mjs (presentation), test/lifetime-streak.test.mjs, test/support/stub-fetch.mjs, test/support/public-fetch.mjs, test/support/recorded-widgets.mjs, test/fixtures/github-contribution-days.json, test/golden-v3/streak.dark.svg, test/golden-v3/streak.light.svg · tests: test/lifetime-streak.test.mjs "the streak counts every day since the account began, read from the public pages with no token @PW-12-S1 @PW-12-ASM-01 @PW-12-ASM-02"; test/lifetime-streak.test.mjs "a year the public page does not give is asked of GraphQL with the token, and both failing is a 503 with Retry-After 300 @PW-12-ASM-03"
  reuses: src/modules/widgets/data/github.mjs publicFirst, publicRest, graphql, profileUser and the year pages of lifetimeContributions; src/modules/widgets/domain/contributions-page.mjs parseContributionsPage
- T3 · PW-12-S1 · test/api-public-camo-streak.test.mjs · tests: test/api-public-camo-streak.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-12-S1 @PW-11-S1 @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"

## Changes to existing behavior

- GET /api/profile/streak.svg · its current streak, longest and active days count since the account's creation year, its title reads `STREAK · SINCE <year>`, and it asks the public REST user and one contributions page per year besides the last year's page and the merged PRs · test/api-public-camo-lifetime.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-11-S1 @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" lists the streak's requests as the last year's page and the merged PRs only: replaced by test/api-public-camo-streak.test.mjs and removed
- test/golden-v3/streak.{dark,light}.svg · drawn with the days since 2017 from the recorded day counts

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/data/github.mjs src/modules/widgets/domain/draw.mjs src/modules/widgets/presentation/respond.mjs test/lifetime-streak.test.mjs test/api-public-camo-streak.test.mjs test/support/stub-fetch.mjs
mutate src/modules/widgets/data/github.mjs: node --test --test-force-exit test/lifetime-streak.test.mjs test/lifetime-contributions.test.mjs test/public-first.test.mjs
mutate src/modules/widgets/domain/draw.mjs: node --test --test-force-exit test/lifetime-streak.test.mjs test/lifetime-contributions.test.mjs test/widgets-aligned.test.mjs test/widgets-aligned-limits.test.mjs test/widgets-views.test.mjs
mutate src/modules/widgets/presentation/respond.mjs: node --test --test-force-exit test/lifetime-streak.test.mjs test/api-aligned.test.mjs test/views.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: PW-11's camo test lists each widget's requests, the streak's as the last year's page and the merged PRs only; the requester asks for every year, so its replacement carries its tags with the streak's year pages and the old test is removed
public-allow: test/lifetime-streak.test.mjs [path] · /users/NahuelMosse is a GitHub URL path the test expects to be asked
public-allow: test/api-public-camo-streak.test.mjs [path] · /users/NahuelMosse is a GitHub URL path the test expects to be asked
public-allow: test/support/public-fetch.mjs [path] · /users/NahuelMosse is a GitHub URL path the stub answers
public-allow: test/support/stub-fetch.mjs [path] · /users/NahuelMosse is a GitHub URL path the stub answers
no-visual: the streak keeps its drawing; only its numbers and its title change, checked by the golden files; this repository has no screen
```

- declared · fault-db · no database: the years come from GitHub, whose failure test/lifetime-streak.test.mjs injects

## Look

plain: no screen; the streak keeps its four numbers and their labels, its title reads `STREAK · SINCE <year>`

## Log

- L1 · igual que hicimos con las contribuciones que sumen de todos los a;os, podemos hacer lo mismo con estos numeros: [Image #1]
- L2 · 2026-11-26 · replaces: test/api-public-camo-lifetime.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-11-S1 @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" · it lists the streak's requests as the last year's page and the merged PRs only · by: test/api-public-camo-streak.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-12-S1 @PW-11-S1 @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"
- L3 · 2026-11-26 · declared · slow-code · src/modules/widgets/data/github.mjs · one contributions page per year, asked in parallel: GitHub's public page gives one year per request and has no batch; the GraphQL fallback asks every year in one query
