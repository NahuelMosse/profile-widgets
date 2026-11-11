# PW-6 · CI accepts newer majors of its actions

status: proposed
cap: 30 min
sources: the requester's message in the session (text, no Jira card); Dependabot PRs #8 (actions/checkout v5 to v7) and #9 (actions/setup-node v5 to v7) and their failing `test` check
not_read: none (no attachments or links)

## Specs

- S1 · "dale, metamos todas menos Portfolio#13, con los arreglos correspondientes"
- PW-6-ASM-01 · the CI workflow may use any major from v5 on for actions/checkout and actions/setup-node (the test checks the action is present and its major is at least 5, as motion-audit's package test does) · S1

## Tasks

- T1 · S1, PW-6-ASM-01 · test/ci-action-majors.test.mjs (rule) · tests: test/ci-action-majors.test.mjs "the repo deploys on Vercel with no build and no framework @PW-6-S1 @PW-6-ASM-01 @PW-1-S3 @PW-1-ASM-05"

## Changes to existing behavior

- test/deploy-server.test.mjs "the repo deploys on Vercel with no build and no framework @PW-1-S3 @PW-1-ASM-05" pins `actions/checkout@v5` and `actions/setup-node@v5`, which the Dependabot PRs contradict: replaced by test/ci-action-majors.test.mjs and removed
- .github/workflows/ci.yml is not edited by this card: the Dependabot PRs #8 and #9 bump it

## Gate

```
suite: node --test --test-force-exit test/*.test.mjs
lint: node --check test/ci-action-majors.test.mjs
refactor-tests: the frozen deploy test pins the actions to exactly @v5; its replacement carries its tags and the old test is removed
no-visual: no screen and no markup change; the card only relaxes a test of the CI workflow
no-docs: no behavior changes; only a test of the CI workflow is relaxed
```

- declared · mutate · no production file: the card only replaces a test
- declared · fault-db · no database

## Look

plain: no screen; the card only replaces a test of the CI workflow

## Log

- L1 · dale, metamos todas menos Portfolio#13, con los arreglos correspondientes
- L2 · 2026-11-11 · replaces: test/deploy-server.test.mjs "the repo deploys on Vercel with no build and no framework @PW-1-S3 @PW-1-ASM-05" · it pins actions/checkout and actions/setup-node to exactly @v5, which Dependabot PRs #8 and #9 move to v7 · by: test/ci-action-majors.test.mjs "the repo deploys on Vercel with no build and no framework @PW-6-S1 @PW-6-ASM-01 @PW-1-S3 @PW-1-ASM-05"
