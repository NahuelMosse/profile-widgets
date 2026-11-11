# PW-5 · the widgets line up, still free

status: proposed
cap: 90 min
sources: the requester's message in the session (text, no Jira card); NahuelMosse/NahuelMosse scripts/live.mjs at origin/NM-4-aligned-free (commit 6c9ca44, PR #9, not merged yet); this repository's PW-4 merge commit f00b98c
not_read: none (no attachments or links)

## Specs

- S1 · "cuando yo pedia el cambio del kit me imagine que iba a alinear los svg, porque veo algunos que son mas anchos que otros y me chocan a la vista"
- PW-5-ASM-01 · every widget draws exactly what NahuelMosse/NahuelMosse scripts/live.mjs draws at NM-4 (commit of origin/NM-4-aligned-free), including the per-position insets of the row widgets; PW-3's cache headers and PW-1's error answers stay · S1
- PW-5-ASM-02 · a row widget (repo-*, tool-*, npm-*) knows its position in its row from its place in repos.json (featured for repo-*, npm for tool-* and npm-*), the way live.mjs lays them with slot(); the URL does not change and takes no new parameter · S1

## Tasks

- T1 · S1, PW-5-ASM-01, PW-5-ASM-02 · src/modules/widgets/domain/draw.mjs (rule), test/golden-v3, test/widgets-aligned.test.mjs, test/widgets-aligned-limits.test.mjs · tests: test/widgets-aligned.test.mjs "each widget draws what the profile's live.mjs draws with its widgets aligned, in both themes @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-aligned-limits.test.mjs "the drawings hold at the edges of their numbers @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-aligned-limits.test.mjs "the download counts hold at their windows @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-aligned-limits.test.mjs "the building card holds at its limits @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-aligned-limits.test.mjs "a log-scale level changes exactly at its boundary and a full window has no empty week @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
  reuses: src/modules/widgets/domain/draw.mjs every drawing function and its data shape (including the `index` that respond.mjs already loads for the row widgets); test/support/recorded-widgets.mjs the recorded widgets
- T2 · S1, PW-5-ASM-01, PW-5-ASM-02 · test/api-aligned.test.mjs, test/api-aligned-camo.test.mjs · tests: test/api-aligned.test.mjs "an upstream failure answers 503 with Retry-After 300 and no-store @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-1-ASM-04"; test/api-aligned.test.mjs "a row widget takes its position from repos.json, whatever the query says @PW-5-ASM-02"; test/api-aligned-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"
  reuses: src/modules/widgets/presentation/respond.mjs as PW-3 left it, unchanged

## Changes to existing behavior

- every widget's SVG changes to NM-4's: widths 1012 / 337 / 252 (the row widgets 337), no frame, no band, one type scale, per-position insets: test/golden, test/widgets-free.test.mjs "each widget draws what the profile's live.mjs drew before its redesign, in both themes @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", the four tests of test/widgets-free-limits.test.mjs, test/api-free.test.mjs "an upstream failure answers 503 with Retry-After 300 and no-store @PW-4-S1 @PW-4-ASM-01 @PW-1-ASM-04" (a tool card without its repo is 176 tall, not 130) and test/api-camo-free.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" (reads test/golden) are contradicted and replaced
- test/widgets-v2.test.mjs "the repository stays at grade mvp @PW-2-ASM-02" stays valid
- test/widgets.test.mjs "views is not a live widget @PW-1-ASM-02" stays valid
- test/api-camo.test.mjs "a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-3-ASM-01 @PW-1-ASM-07" stays valid
- the answers of respond.mjs (headers, 404, 503, 500, 405) and the URLs do not change

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/domain/draw.mjs
mutate src/modules/widgets/domain/draw.mjs: node --test --test-force-exit test/widgets.test.mjs test/widgets-aligned.test.mjs test/widgets-aligned-limits.test.mjs test/api-aligned.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: the drawings change to NM-4's, so the PW-4 tests that compare against test/golden and the PW-1 coordinates, and the two tests that read test/golden or the 130 height, are contradicted; their replacements carry their tags and the old tests and test/golden are removed
no-visual: the SVG widgets are images whose drawing is fixed by golden files from the profile's live.mjs; this repository has no screen
```

- declared · fault-db · no database: the data comes from the GitHub and npm APIs, whose failure test/api-aligned.test.mjs injects
- declared · mutate · src/modules/widgets/presentation/respond.mjs · unchanged since PW-3
- declared · mutate · scripts/dev.mjs · the local server of the gate, not shipped

## Look

plain: the SVG widgets are images drawn exactly like the profile's live.mjs draws them at NM-4 (golden files); this repository has no screen, so no design line, component set or motion rule applies

## Log

- L1 · cuando yo pedia el cambio del kit me imagine que iba a alinear los svg, porque veo algunos que son mas anchos que otros y me chocan a la vista
