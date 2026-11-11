# PW-1 · live profile widgets

status: proposed
cap: 150 min
sources: the requester's messages in the session (text, no Jira card) and their answers to two questions (hosting, where the widgets live)
not_read: none (no attachments or links)

## Specs

- S1 · "como esta cosa para los svg"
- S2 · "la idea es no pagar por servidor"
- S3 · "Repo aparte en mvp"
- PW-1-ASM-01 · GET /api/profile/<name>.svg?theme=dark|light draws the profile widgets the README shows today (streak, heatmap, skyline, building, npm, npm-<package>, repo-<repo>, tool-<package>) the way scripts/live.mjs of NahuelMosse/NahuelMosse draws them; theme defaults to dark · S1
- PW-1-ASM-02 · the views widget stays on the profile's daily workflow, because komarev counts every fetch and a live widget would count itself · S1
- PW-1-ASM-03 · widget responses carry `Cache-Control: public, s-maxage=1800, stale-while-revalidate=86400`, so Vercel's edge serves most requests and the functions stay within the free tier · S2
- PW-1-ASM-04 · an unknown widget name or theme answers 404 with a plain-text body naming the valid ones; a failure of the GitHub or npm API answers 503 with `Retry-After: 300` and `Cache-Control: no-store` · S1
- PW-1-ASM-05 · Node functions under api/ with no framework and no build, on the requester's Vercel Hobby account; the GitHub token is the `GITHUB_TOKEN` environment variable of the Vercel project (a read-only fine-grained token); lab.nawi.dev/api/profile/* rewrites here · S2, S3

## Tasks

- T1 · S1, PW-1-ASM-01, PW-1-ASM-02 · src/modules/widgets/domain/draw.mjs (rule), src/modules/widgets/domain/themes.mjs (rule), src/modules/widgets/data/github.mjs (data), src/modules/widgets/data/npm.mjs (data), src/modules/widgets/data/repos.json (data), test/widgets.test.mjs · tests: test/widgets.test.mjs "each README widget draws from its data in both themes @PW-1-S1 @PW-1-ASM-01"; test/widgets.test.mjs "views is not a live widget @PW-1-ASM-02"
  new: the drawings and queries are ported from scripts/live.mjs of the NahuelMosse/NahuelMosse repository (another repository, nothing to import)
- T2 · S2, PW-1-ASM-03, PW-1-ASM-04 · api/profile/[name].mjs (presentation), src/modules/widgets/presentation/respond.mjs (presentation), test/api.test.mjs · tests: test/api.test.mjs "a widget answers an SVG cached at the edge for 1800 s and stale for 86400 s @PW-1-S2 @PW-1-ASM-03"; test/api.test.mjs "an unknown widget or theme answers 404 naming the valid ones @PW-1-ASM-04"; test/api.test.mjs "an upstream failure answers 503 with Retry-After 300 and no-store @PW-1-ASM-04"
  new: no HTTP layer yet
- T3 · S3, PW-1-ASM-05 · scripts/dev.mjs (presentation), package.json (data), .github/workflows/ci.yml (data), README.md (presentation), test/deploy.test.mjs · tests: test/deploy.test.mjs "the repo deploys on Vercel with no build and no framework @PW-1-S3 @PW-1-ASM-05"
  new: a local server that routes /api like Vercel, for the gate and the attacks

## Changes to existing behavior

- none (new repository)

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/domain/draw.mjs
mutate src/modules/widgets/domain/draw.mjs: node --test --test-force-exit test/widgets.test.mjs
mutate src/modules/widgets/presentation/respond.mjs: node --test --test-force-exit test/api.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --read "/api/profile/nope.svg"
refactor-tests: the first-round tests asserted the wrong SVG attributes (aria-label text, y vs y1) and crashed Node on Windows on exit; their replacements are test/widgets-card.test.mjs and test/deploy-server.test.mjs, same tags
no-visual: the SVG widgets are images whose drawing is fixed by golden files from the profile's live.mjs; this repository has no screen
```

- declared · fault-db · no database: the data comes from the GitHub and npm APIs, whose failure test/api.test.mjs injects
- declared · mutate · src/modules/widgets/domain/themes.mjs · constant palettes, no decision
- declared · mutate · src/modules/widgets/data/github.mjs · network adapter: its queries are fixed strings; the tests feed the domain with recorded answers
- declared · mutate · src/modules/widgets/data/npm.mjs · network adapter, as github.mjs
- declared · mutate · api/profile/[name].mjs · Vercel entry point that only wires respond.mjs to the adapters
- declared · mutate · scripts/dev.mjs · the local server of the gate, not shipped

## Log

- L1 · yo queria armar el laboratorio, podria ser el momento de armarlo, lab.nawi.dev, la idea es no pagar por servidor aviso · (answer to "what is lab.nawi.dev") Osea quiero poner ahi mil paginas, tipo ahi metemos cebador, sonria y miga y ademas otras cosas que quiera levantar, como esta cosa para los svg · (answer to "where do we host it for free") Vercel Hobby (Recommended) · el lab no puede salir de poc, tenelo en cuenta · (answer to "where do the widgets live") Repo aparte en mvp (Recommended)
- L2 · 2026-11-11 · replaces: test/widgets.test.mjs "each README widget draws from its data in both themes @PW-1-S1 @PW-1-ASM-01" · two assertions are wrong, not the app: the card text legitimately stays whole in the aria-label and the title, and the hairline attribute is y1, not y · by: test/widgets-card.test.mjs "each README widget draws from its data in both themes @PW-1-S1 @PW-1-ASM-01"
- L3 · 2026-11-11 · replaces: test/deploy.test.mjs "the repo deploys on Vercel with no build and no framework @PW-1-S3 @PW-1-ASM-05" · its global fetch against the child dev server aborts Node on Windows at the forced exit after every assertion passed · by: test/deploy-server.test.mjs "the repo deploys on Vercel with no build and no framework @PW-1-S3 @PW-1-ASM-05"
- L4 · 2026-11-11 · T1-T3 · gate red · suite, mutate draw.mjs/themes.mjs, required · frozen test/widgets.test.mjs first test and test/deploy.test.mjs are wrong (replaced by test/widgets-card.test.mjs and test/deploy-server.test.mjs) but still run in test/*.test.mjs, so the unmutated suite is red and mutation cannot start; risk escalated to high (judge plan missing); UI-lens checks fire on SVG markup
