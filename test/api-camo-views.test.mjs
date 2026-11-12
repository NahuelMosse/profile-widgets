import { test } from "node:test";
import assert from "node:assert/strict";
import * as handler from "../api/profile/[name].mjs";
import { fixtureFetch, TOKEN } from "./support/stub-fetch.mjs";

const url = (path) => new URL(path, "https://widgets.example");
const ask = (path) => handler.GET(new Request(url(path)));
const TEXT = "text/plain; charset=utf-8";
const WIDGET_CACHE = "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400";

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

test("a 404 is cached for 300 s while a 200 widget is stale-served for 86400 s @PW-8-S2 @PW-7-ASM-04 @PW-3-ASM-01 @PW-1-ASM-07", async () => {
  for (const path of ["/api/profile/nope.svg", "/api/profile/streak.svg?theme=sepia", "/api/profile/visits.svg", "/api/profile/%E0%A4%A.svg"]) {
    const response = await withFetch(() => { throw new Error("no request expected"); }, () => ask(path));
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("cache-control"), "public, max-age=300", path);
    assert.equal(response.headers.get("content-type"), TEXT, path);
  }

  // The other answers keep their own cache rules.
  await withToken(TOKEN, async () => {
    const widget = await withFetch(fixtureFetch, () => ask("/api/profile/streak.svg"));
    assert.equal(widget.headers.get("cache-control"), WIDGET_CACHE);
  });
  // With no token and GitHub unreachable the widget is unavailable.
  const unavailable = await withToken(undefined, () => withFetch(async () => { throw new TypeError("fetch failed"); }, () => ask("/api/profile/streak.svg")));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("cache-control"), "no-store");
});
