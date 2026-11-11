# PW-4 · back to the free drawings

status: proposed
cap: 90 min
sources: the requester's message in the session (text, no Jira card); NahuelMosse/NahuelMosse commit 845c8f6 (scripts/live.mjs before its redesign); this repository's PW-1 merge commit 8b33085
not_read: none (no attachments or links)

## Specs

- S1 · "me gustaba el readme mas como se veia antes del redise;o del kit la verdad, me gustaba cuando todo estaba mas libre y no contenido en rectangulitos que los limitan"
- PW-4-ASM-01 · the widgets draw again exactly what PW-1 drew (the profile's scripts/live.mjs before its redesign, NahuelMosse/NahuelMosse commit 845c8f6); PW-3's cache headers and PW-1's error answers stay · S1

## Tasks

- T1 · S1, PW-4-ASM-01 · src/modules/widgets/domain/draw.mjs (rule), test/golden, test/widgets-free.test.mjs, test/widgets-free-limits.test.mjs · tests: test/widgets-free.test.mjs "each widget draws what the profile's live.mjs drew before its redesign, in both themes @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-free-limits.test.mjs "the drawings hold at the edges of their numbers @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-free-limits.test.mjs "the download counts hold at their windows @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-free-limits.test.mjs "the building card holds at its limits @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"; test/widgets-free-limits.test.mjs "a log-scale level changes exactly at its boundary and a full window has no empty week @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
  reuses: src/modules/widgets/domain/draw.mjs as 8b33085 had it (every drawing function and its data shape); test/golden as 8b33085 had it
- T2 · S1, PW-4-ASM-01 · test/api-free.test.mjs, test/api-camo-free.test.mjs · tests: test/api-free.test.mjs "an upstream failure answers 503 with Retry-After 300 and no-store @PW-4-S1 @PW-4-ASM-01 @PW-1-ASM-04"; test/api-camo-free.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"
  reuses: src/modules/widgets/presentation/respond.mjs as PW-3 left it, unchanged

## Changes to existing behavior

- every widget's SVG goes back to PW-1's (sizes, no frame, no band, type scale): test/golden-v2, test/widgets-v2.test.mjs "each widget draws what the profile's new live.mjs draws, in both themes, full width 1012 and thirds 337 by 176 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", test/widgets-v2-limits.test.mjs, test/widgets-v2-edges.test.mjs, test/api.test.mjs "an upstream failure answers 503 with Retry-After 300 and no-store @PW-1-ASM-04" (a tool card without its repo is 130 tall) and test/api-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" (reads golden-v2) are contradicted and replaced
- test/widgets-v2.test.mjs "the repository stays at grade mvp @PW-2-ASM-02" stays valid
- the answers of respond.mjs (headers, 404, 503, 500, 405) do not change

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/domain/draw.mjs
mutate src/modules/widgets/domain/draw.mjs: node --test --test-force-exit test/widgets.test.mjs test/widgets-free.test.mjs test/widgets-free-limits.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: the drawings go back to PW-1's, so the PW-2 tests that compare against golden-v2 and the v2 coordinates, and the two PW-1/PW-3 tests that read golden-v2 or the v2 height, are contradicted; their replacements carry their tags and the old tests are removed from their files
no-visual: the SVG widgets are images whose drawing is fixed by golden files from the profile's live.mjs; this repository has no screen
```

- declared · fault-db · no database: the data comes from the GitHub and npm APIs, whose failure test/api-free.test.mjs injects
- declared · mutate · src/modules/widgets/presentation/respond.mjs · unchanged since PW-3
- declared · mutate · scripts/dev.mjs · the local server of the gate, not shipped

## Look

plain: the SVG widgets are images drawn exactly like PW-1 drew them (golden files); this repository has no screen, so no design line, component set or motion rule applies

## Log

- L1 · me gustaba el readme mas como se veia antes del redise;o del kit la verdad, me gustaba cuando todo estaba mas libre y no contenido en rectangulitos que los limitan
- L2 · 2026-11-11 · replaces: test/widgets-v2.test.mjs "each widget draws what the profile's new live.mjs draws, in both themes, full width 1012 and thirds 337 by 176 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01" · the drawings go back to PW-1's, so its golden-v2 files and v2 coordinates describe drawings that no longer exist · by: test/widgets-free.test.mjs "each widget draws what the profile's live.mjs drew before its redesign, in both themes @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L3 · 2026-11-11 · replaces: test/widgets-v2-limits.test.mjs "the drawings hold at the edges of their numbers @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01" · the drawings go back to PW-1's, so its golden-v2 files and v2 coordinates describe drawings that no longer exist · by: test/widgets-free-limits.test.mjs "the drawings hold at the edges of their numbers @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L4 · 2026-11-11 · replaces: test/widgets-v2-limits.test.mjs "the download counts hold at their windows @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01" · the drawings go back to PW-1's, so its golden-v2 files and v2 coordinates describe drawings that no longer exist · by: test/widgets-free-limits.test.mjs "the download counts hold at their windows @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L5 · 2026-11-11 · replaces: test/widgets-v2-limits.test.mjs "the building card holds at its limits @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01" · the drawings go back to PW-1's, so its golden-v2 files and v2 coordinates describe drawings that no longer exist · by: test/widgets-free-limits.test.mjs "the building card holds at its limits @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L6 · 2026-11-11 · replaces: test/widgets-v2-limits.test.mjs "a log-scale level changes exactly at its boundary and a full window has no empty week @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01" · the drawings go back to PW-1's, so its golden-v2 files and v2 coordinates describe drawings that no longer exist · by: test/widgets-free-limits.test.mjs "a log-scale level changes exactly at its boundary and a full window has no empty week @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L7 · 2026-11-11 · replaces: test/widgets-v2-limits.test.mjs "the latest reviewable work shows its date without the time @PW-2-S1 @PW-2-ASM-01" · the date line belongs to the v2 building card, which PW-1's drawing does not have · by: test/widgets-free.test.mjs "each widget draws what the profile's live.mjs drew before its redesign, in both themes @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L8 · 2026-11-11 · replaces: test/widgets-v2-edges.test.mjs "the skyline's frame follows its tallest prism @PW-2-S1 @PW-1-S1" · the frame height belongs to the v2 skyline; PW-1's skyline has a fixed size · by: test/widgets-free.test.mjs "each widget draws what the profile's live.mjs drew before its redesign, in both themes @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L9 · 2026-11-11 · replaces: test/widgets-v2-edges.test.mjs "a repo card's text falls back from the profile's description to GitHub's and then to nothing @PW-2-S1 @PW-1-S1" · it reads the v2 card's text line at y=104, which PW-1's card does not draw there · by: test/widgets-free.test.mjs "each widget draws what the profile's live.mjs drew before its redesign, in both themes @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01"
- L10 · 2026-11-11 · replaces: test/api.test.mjs "an upstream failure answers 503 with Retry-After 300 and no-store @PW-1-ASM-04" · it asserts the v2 height 176 of a tool card without its repo; PW-1's is 130 · by: test/api-free.test.mjs "an upstream failure answers 503 with Retry-After 300 and no-store @PW-4-S1 @PW-4-ASM-01 @PW-1-ASM-04"
- L11 · 2026-11-11 · replaces: test/api-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" · it compares the answers against golden-v2, which goes away · by: test/api-camo-free.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"
