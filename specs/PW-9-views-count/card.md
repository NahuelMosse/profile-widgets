# PW-9 · The views chip counts the views

status: proposed
cap: 30 min
sources: the requester's message in the session (text, no Jira card); measured on 2026-11-12: komarev.com counts a request of its badge only when its User-Agent is GitHub's image proxy (`github-camo (…)`); with another one it answers the count without adding to it, so since NM-5 dropped the pixel no view is counted
not_read: none (no attachments or links)

## Specs

- S1 · "no veo que las visitas se actualicen"
- PW-9-ASM-01 · the views widget asks komarev's badge with the User-Agent of the request it answers, so a view GitHub's image proxy asks for is counted as the pixel counted it; a request with another User-Agent reads the count without adding to it, as komarev decides; a request with none sends none of its own · S1

## Tasks

- T1 · S1, PW-9-ASM-01 · src/modules/widgets/data/komarev.mjs (data), api/profile/[name].mjs (presentation), test/views-count.test.mjs · tests: test/views-count.test.mjs "the views widget asks komarev with the User-Agent of the view it answers, github-camo included @PW-9-S1 @PW-9-ASM-01"
  reuses: src/modules/widgets/data/komarev.mjs profileViews; api/profile/[name].mjs fetchers

## Changes to existing behavior

- GET /api/profile/views.svg · the request to komarev carries the caller's User-Agent · no earlier test contradicts it

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/data/komarev.mjs api/profile/[name].mjs test/views-count.test.mjs
mutate src/modules/widgets/data/komarev.mjs: node --test --test-force-exit test/views-count.test.mjs test/views.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
no-visual: the chip's drawing does not change; this repository has no screen
```

- declared · mutate · api/profile/[name].mjs · it only passes the request's User-Agent to the komarev fetcher; test/views-count.test.mjs reaches it through the handler
- declared · fault-db · no database

## Look

plain: no screen; the chip's drawing does not change

## Log

- L1 · no veo que las visitas se actualicen
