# PW-10 · The views chip only reads the count

status: proposed
cap: 30 min
sources: the requester's message in the session (text, no Jira card); PW-9, which passes the viewer's User-Agent to komarev so the chip counts; measured on 2026-11-12 after PW-9 deployed: three requests of the chip through GitHub's image proxy all read 1,491, so the forwarding did not count either
not_read: none (no attachments or links)

## Specs

- S1 · "no seria mejor y mas seguro volver a poner el pixel y que nosotros solo le peguemos para sacar el numero?"
- PW-10-ASM-01 · the README's komarev pixel counts each view again (NahuelMosse/NahuelMosse); the views widget asks komarev's badge with no User-Agent of its own choosing (none forwarded), which komarev does not count, and draws the number it reads; the chip may show the count before or after its own view is added · S1

## Tasks

- T1 · S1, PW-10-ASM-01 · src/modules/widgets/data/komarev.mjs (data), api/profile/[name].mjs (presentation), test/views-read-only.test.mjs · tests: test/views-read-only.test.mjs "the views widget only reads komarev's count, passing on no User-Agent @PW-10-S1 @PW-10-ASM-01 @PW-9-S1"
  reuses: src/modules/widgets/data/komarev.mjs profileViews

## Changes to existing behavior

- GET /api/profile/views.svg · the request to komarev no longer carries the caller's User-Agent · test/views-count.test.mjs "the views widget asks komarev with the User-Agent of the view it answers, github-camo included @PW-9-S1 @PW-9-ASM-01" is contradicted: replaced by test/views-read-only.test.mjs and removed

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/data/komarev.mjs api/profile/[name].mjs test/views-read-only.test.mjs
mutate src/modules/widgets/data/komarev.mjs: node --test --test-force-exit test/views-read-only.test.mjs test/views.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: PW-9's test asks the widget to forward the viewer's User-Agent so komarev counts; the requester chooses the pixel to count and the widget only to read, so its replacement carries the PW-9-S1 tag with no User-Agent forwarded and the old test is removed
no-visual: the chip's drawing does not change; this repository has no screen
```

- declared · mutate · api/profile/[name].mjs · it goes back to passing the shared fetchers; test/views-read-only.test.mjs reaches it through the handler
- declared · fault-db · no database

## Look

plain: no screen; the chip's drawing does not change

## Log

- L1 · no seria mejor y mas seguro volver a poner el pixel y que nosotros solo le peguemos para sacar el numero?
- L2 · 2026-11-12 · replaces: test/views-count.test.mjs "the views widget asks komarev with the User-Agent of the view it answers, github-camo included @PW-9-S1 @PW-9-ASM-01" · the requester chooses the pixel to count and the widget only to read · by: test/views-read-only.test.mjs "the views widget only reads komarev's count, passing on no User-Agent @PW-10-S1 @PW-10-ASM-01 @PW-9-S1"
