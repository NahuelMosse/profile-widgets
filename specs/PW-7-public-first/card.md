# PW-7 · GitHub's public interfaces first, the token as fallback

status: proposed
cap: 60 min
sources: the requester's message in the session (text, no Jira card); the option it chooses, as offered in the session: "2. Leer el calendario de tu perfil público (github.com/users/NahuelMosse/contributions), sin token. Da exactamente lo que muestra tu perfil (6.743), pero ese HTML no es una API y si GitHub lo cambia, el widget se rompe."; the diagnosis behind it: the lab's fine-grained token leaves out the private contributions of the kovix-tech organization (4,955 drawn against the profile's 6,743)
not_read: none (no attachments or links)

## Specs

- S1 · "prefiero la dos"
- S2 · "todo lo que se pueda sacar con las interfaces de github dejemoslo con esas interfaces de github"
- S3 · "y como workarround lo nuestro"
- PW-7-ASM-01 · the calendar of the skyline, heatmap and streak comes from the public page github.com/users/<user>/contributions, asked with no token: each day's count is its cell's tooltip ("No contributions on …" is 0, "N contribution(s) on …" is N) and the total is the sum of the days, so the widgets draw what the profile shows · S1
- PW-7-ASM-02 · GitHub's interfaces are what GitHub answers with no token: that page and the public REST API (the merged PR search, a repo, the owner's repos by last push without forks, the public events); every datum is asked there first, with no Authorization header · S2
- PW-7-ASM-03 · "ours" is the token query each datum has today (GraphQL for the calendar and the repos, REST with the token for the rest); it answers only when the public one fails: an error status, a network failure, or a page whose day cells no longer all carry a count · S3
- PW-7-ASM-04 · with no token the public interfaces are still asked; when they fail the widget answers 503 with Retry-After 300, as an upstream failure does today · S3
- PW-7-ASM-05 · a 404 from the public REST API is an answer (the repo is not on GitHub), not a failure: it is not asked again with the token · S2

## Tasks

- T1 · S1, PW-7-ASM-01 · src/modules/widgets/domain/contributions-page.mjs (rule), test/contributions-page.test.mjs, test/fixtures/github-contributions.json · tests: test/contributions-page.test.mjs "the profile's contributions page gives each day's count and their sum @PW-7-S1 @PW-7-ASM-01"; test/contributions-page.test.mjs "a page whose day cells do not all carry a count is refused @PW-7-ASM-01 @PW-7-ASM-03"
  new: no HTML parsing exists in the module or the repo (Grep html|tool-tip|matchAll in src/); the calendar shape it returns is the one github.mjs calendar() returns today
- T2 · S1, S2, S3, PW-7-ASM-02, PW-7-ASM-03, PW-7-ASM-04, PW-7-ASM-05 · src/modules/widgets/data/github.mjs (data), README.md, test/public-first.test.mjs, test/support/public-fetch.mjs · tests: test/public-first.test.mjs "the calendar comes from the public profile page with no token @PW-7-S1 @PW-7-ASM-01"; test/public-first.test.mjs "every datum is asked of GitHub's public interfaces first, with no token @PW-7-S2 @PW-7-ASM-02"; test/public-first.test.mjs "the token query answers when the public one fails @PW-7-S3 @PW-7-ASM-03"; test/public-first.test.mjs "with no token the public interfaces still answer, and their failure is a 503 with Retry-After 300 @PW-7-ASM-04"; test/public-first.test.mjs "a repo the public API does not find is not asked again with the token @PW-7-ASM-05"
  reuses: src/modules/widgets/data/github.mjs graphql, rest, profileUser (the token queries stay as the fallback); test/support/stub-fetch.mjs fixtureFetch
- T3 · PW-7-S2 · test/api-public-camo.test.mjs · tests: test/api-public-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03"

## Changes to existing behavior

- src/modules/widgets/data/github.mjs · calendar(), mergedPullRequests(), repo(), recentRepos() and publicEvents() ask GitHub with no token first; the calendar and the repos list move to the public page and REST · test/api-aligned-camo.test.mjs "a widget tells GitHub's image proxy to refetch after 1800 s @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03" pins the GraphQL requests: replaced by test/api-public-camo.test.mjs and removed
- the widgets' drawings, cache headers and error statuses do not change: the golden files stay
- README.md · GITHUB_TOKEN becomes the fallback, no longer required

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check src/modules/widgets/domain/contributions-page.mjs src/modules/widgets/data/github.mjs test/contributions-page.test.mjs test/public-first.test.mjs test/api-public-camo.test.mjs test/support/public-fetch.mjs
mutate src/modules/widgets/domain/contributions-page.mjs: node --test --test-force-exit test/contributions-page.test.mjs test/public-first.test.mjs
mutate src/modules/widgets/data/github.mjs: node --test --test-force-exit test/public-first.test.mjs test/api-public-camo.test.mjs test/api-aligned.test.mjs test/api-errors.test.mjs
app: node scripts/dev.mjs
attacks: node .claude/tools/attack.mjs --json --read "/api/profile/streak.svg" --item-path "/api/profile/{id}.svg"
refactor-tests: the frozen camo test pins each widget's requests to the GraphQL and token REST calls, which the public interfaces now answer; its replacement carries its tags with the public requests and the old test is removed
no-visual: the SVG widgets keep their drawings, fixed by the golden files; this repository has no screen
```

- declared · fault-db · no database: the data comes from GitHub and npm, whose failures test/public-first.test.mjs and test/api-aligned.test.mjs inject

## Look

plain: no screen; the widgets keep their drawings and only their data source changes

## Log

- L1 · prefiero la dos, y todo lo que se pueda sacar con las interfaces de github dejemoslo con esas interfaces de github y como workarround lo nuestro
