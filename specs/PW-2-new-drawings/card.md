# PW-2 · the README's new drawings

status: proposed
cap: 120 min
sources: the requester's message in the session (text, no Jira card); the drawings were redesigned in NahuelMosse/NahuelMosse card NM-1 (scripts/live.mjs on its main)
not_read: none (no attachments or links)

## Specs

- S1 · "los widgets los podes pasar por el kit en modo poc para que se vean bien todos juntos en el readme porfa"
- PW-2-ASM-01 · every widget draws exactly what scripts/live.mjs of NahuelMosse/NahuelMosse draws since NM-1 (one frame, one title band, one type scale), new sizes included: full-width widgets 1012 wide, third-width ones 337 wide and 176 tall, the card of a repository or package sitting at its place in the row · S1
- PW-2-ASM-02 · "en modo poc" is read as a light card (this one); the repository stays at grade mvp, as PW-1 decided, and the code is built and gated like PW-1's · S1

## Tasks

- T1 · S1, PW-2-ASM-01 · src/modules/widgets/domain/draw.mjs (rule), src/modules/widgets/presentation/respond.mjs (presentation), test/widgets-v2.test.mjs, test/api.test.mjs · tests: test/widgets-v2.test.mjs "each widget draws what the profile's new live.mjs draws, in both themes, full width 1012 and thirds 337 by 176 @PW-2-S1 @PW-2-ASM-01"; test/widgets-v2.test.mjs "the repository stays at grade mvp @PW-2-ASM-02"
  reuses: src/modules/widgets/domain/draw.mjs every drawing function and its data shape; src/modules/widgets/presentation/respond.mjs WIDGETS table

## Changes to existing behavior

- every widget's SVG changes (sizes, frame, band, type scale): test/golden and the tests that compare against it (test/widgets-card.test.mjs, test/widgets-limits.test.mjs, test/widgets-windows.test.mjs) are contradicted by this card and replaced by test/widgets-v2.test.mjs and its golden-v2 files; test/api.test.mjs now reads golden-v2

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/domain/draw.mjs
mutate src/modules/widgets/domain/draw.mjs: node --test --test-force-exit test/widgets.test.mjs test/widgets-v2.test.mjs test/widgets-v2-limits.test.mjs
mutate src/modules/widgets/presentation/respond.mjs: node --test --test-force-exit test/api.test.mjs test/api-errors.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: the drawings changed, so the tests that compare against the old goldens and the old coordinates are contradicted; their replacement is test/widgets-v2.test.mjs, same spec
no-visual: the SVG widgets are images whose drawing is fixed by golden files from the profile's live.mjs; this repository has no screen
```

- declared · fault-db · no database: the data comes from the GitHub and npm APIs, whose failure test/api.test.mjs injects
- declared · mutate · scripts/dev.mjs · the local server of the gate, not shipped

## Look

plain: the SVG widgets are images drawn exactly like the profile live.mjs draws them (golden files); this repository has no screen, so no design line, component set or motion rule applies

## Log

- L1 · los widgets los podes pasar por el kit en modo poc para que se vean bien todos juntos en el readme porfa
- L2 · 2026-11-11 · replaces: test/widgets-card.test.mjs "each README widget draws from its data in both themes @PW-1-S1 @PW-1-ASM-01" · the drawings changed in NM-1 (sizes, frame, band, type scale), so its golden files and coordinates describe drawings that no longer exist · by: test/widgets-v2.test.mjs "each widget draws what the profile's new live.mjs draws, in both themes, full width 1012 and thirds 337 by 176 @PW-2-S1 @PW-2-ASM-01"
- L3 · 2026-11-11 · replaces: test/widgets-limits.test.mjs "the drawings hold at the edges of their numbers @PW-1-S1 @PW-1-ASM-01" · the drawings changed in NM-1, so its coordinates describe drawings that no longer exist · by: test/widgets-v2-limits.test.mjs "the drawings hold at the edges of their numbers @PW-2-S1 @PW-2-ASM-01"
- L4 · 2026-11-11 · replaces: test/widgets-limits.test.mjs "the download counts hold at their windows @PW-1-S1 @PW-1-ASM-01" · the drawings changed in NM-1, so its coordinates describe drawings that no longer exist · by: test/widgets-v2-limits.test.mjs "the download counts hold at their windows @PW-2-S1 @PW-2-ASM-01"
- L5 · 2026-11-11 · replaces: test/widgets-limits.test.mjs "the building card holds at its limits @PW-1-S1 @PW-1-ASM-01" · the drawings changed in NM-1, so its coordinates describe drawings that no longer exist · by: test/widgets-v2-limits.test.mjs "the building card holds at its limits @PW-2-S1 @PW-2-ASM-01"
- L6 · 2026-11-11 · replaces: test/widgets-windows.test.mjs "a log-scale level changes exactly at its boundary and a full window has no empty week @PW-1-S1 @PW-1-ASM-01" · the drawings changed in NM-1, so its coordinates describe drawings that no longer exist · by: test/widgets-v2-limits.test.mjs "a log-scale level changes exactly at its boundary and a full window has no empty week @PW-2-S1 @PW-2-ASM-01"
