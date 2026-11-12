import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as handler from "../api/profile/[name].mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import * as npm from "../src/modules/widgets/data/npm.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };
import { NOW, TOKEN } from "./support/stub-fetch.mjs";
import { publicFetch } from "./support/public-fetch.mjs";

const fetchers = { ...github, ...npm };
const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");
const url = (path) => new URL(path, "https://widgets.example");
const ask = (path) => handler.GET(new Request(url(path)));
const WIDGET_CACHE = "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400";

let requests = [];
const recordingFetch = (input, init) => publicFetch({ requests })(input, init);

async function withFetch(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

async function withToken(token, run) {
  const original = process.env.GITHUB_TOKEN;
  if (token === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = token;
  try {
    return await run();
  } finally {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  }
}

test("a widget tells GitHub's image proxy to refetch after 1800 s @PW-7-S2 @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-3-S1 @PW-3-ASM-01 @PW-1-S2 @PW-1-ASM-03", async () => {
  const expected = {
    streak: ["github.com/users/NahuelMosse/contributions", "api.github.com/search/issues"],
    heatmap: ["github.com/users/NahuelMosse/contributions"],
    skyline: ["github.com/users/NahuelMosse/contributions"],
    building: ["api.github.com/users/NahuelMosse/repos", "api.github.com/users/NahuelMosse/events/public"],
    "repo-Portfolio": ["api.github.com/repos/NahuelMosse/Portfolio"],
    "tool-motion-audit": ["api.github.com/repos/NahuelMosse/motion-audit"],
    "npm-http-attack": ["registry.npmjs.org/http-attack", "api.npmjs.org/downloads/range/http-attack"],
    npm: lists.npm.flatMap((p) => [`registry.npmjs.org/${p}`, `api.npmjs.org/downloads/range/${p}`]),
  };
  await withToken(TOKEN, () => withFetch(recordingFetch, async () => {
    const response = await ask("/api/profile/streak.svg?theme=light");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), WIDGET_CACHE);
    assert.equal(await response.text(), golden("streak", "light"));

    // The theme defaults to dark and the .svg suffix is optional.
    assert.equal(await (await ask("/api/profile/streak.svg")).text(), golden("streak", "dark"));
    assert.equal(await (await ask("/api/profile/streak?theme=dark")).text(), golden("streak", "dark"));

    const direct = await respond("heatmap", "dark", fetchers, NOW);
    assert.deepEqual(direct, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": WIDGET_CACHE },
      body: golden("heatmap", "dark"),
    });

    const drawn = [["skyline", "dark"], ["repo-Portfolio", "dark"], ["tool-http-attack", "light"], ["npm-motion-audit", "dark"], ["npm", "light"], ["building", "dark"]];
    for (const [name, theme] of drawn) assert.equal((await respond(name, theme, fetchers, NOW)).body, golden(name, theme), `${name}.${theme}`);

    // Each widget asks only for the data it draws, of GitHub's public interfaces, with no token.
    for (const [name, urls] of Object.entries(expected)) {
      requests.length = 0;
      assert.equal((await ask(`/api/profile/${name}.svg`)).status, 200, name);
      assert.deepEqual(requests.map((r) => r.at).sort(), [...urls].sort(), name);
      assert.ok(requests.every((r) => !r.token), name);
    }
  }));
});
