import { test } from "node:test";
import assert from "node:assert/strict";
import * as handler from "../api/profile/[name].mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import * as npm from "../src/modules/widgets/data/npm.mjs";
import { fixtureFetch, NOW, TOKEN } from "./support/stub-fetch.mjs";

const TEXT = "text/plain; charset=utf-8";
const url = (path) => new URL(path, "https://widgets.example");

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

const brokenCalendar = { data: { user: { contributionsCollection: { contributionCalendar: { totalContributions: 1, weeks: [{}] } } } } };

test("a drawing bug answers 500 no-store and other methods 405 with Allow GET, HEAD @PW-1-ASM-06", async () => {
  // Data that arrives well but cannot be drawn is the app's bug, not the upstream's.
  const fetchers = { ...github, ...npm, calendar: async () => ({ totalContributions: 1, weeks: [{}] }) };
  const answer = await respond("heatmap", "dark", fetchers, NOW);
  assert.deepEqual(answer, { status: 500, headers: { "Content-Type": TEXT, "Cache-Control": "no-store" }, body: "Internal error.\n" });

  await withToken(TOKEN, async () => {
    const fromApi = await withFetch(async () => new Response(JSON.stringify(brokenCalendar), { status: 200 }), () => handler.GET(new Request(url("/api/profile/heatmap.svg"))));
    assert.equal(fromApi.status, 500);
    assert.equal(fromApi.headers.get("cache-control"), "no-store");
    assert.equal(fromApi.headers.get("retry-after"), null);

    // An upstream that answers an error is still a 503.
    const down = await withFetch(async () => new Response("{}", { status: 500 }), () => handler.GET(new Request(url("/api/profile/heatmap.svg"))));
    assert.equal(down.status, 503);
  });

  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.equal(typeof handler[method], "function", method);
    const response = await handler[method](new Request(url("/api/profile/streak.svg"), { method }));
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "GET, HEAD", method);
    assert.equal(response.headers.get("content-type"), TEXT, method);
    assert.equal(await response.text(), "Method not allowed.\n", method);
  }

  assert.equal(typeof handler.HEAD, "function");
  await withToken(TOKEN, async () => {
    const head = await withFetch(fixtureFetch, () => handler.HEAD(new Request(url("/api/profile/streak.svg"), { method: "HEAD" })));
    assert.equal(head.status, 200);
  });
});
