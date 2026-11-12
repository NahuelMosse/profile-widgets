import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as handler from "../api/profile/[name].mjs";
import { fixtureFetch, TOKEN } from "./support/stub-fetch.mjs";
import { publicFetch } from "./support/public-fetch.mjs";

const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");
const ask = (path, method = "GET") => handler[method](new Request(new URL(path, "https://widgets.example"), { method }));
const NEVER_CACHED = "max-age=0, no-cache, no-store, must-revalidate";
const WIDGET_CACHE = "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400";
const TEXT = "text/plain; charset=utf-8";

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

test("the views widget counts and draws on every request, never cached @PW-8-S2 @PW-8-ASM-01 @PW-8-ASM-02", async () => {
  const asked = [];
  const counting = (input, init = {}) => {
    asked.push({ url: new URL(typeof input === "string" ? input : input.url), authorization: new Headers(init.headers ?? {}).get("authorization") });
    return fixtureFetch(input, init);
  };
  await withToken(TOKEN, () => withFetch(counting, async () => {
    for (const [path, theme] of [["/api/profile/views.svg", "dark"], ["/api/profile/views.svg?theme=light", "light"], ["/api/profile/views", "dark"]]) {
      const response = await ask(path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("content-type"), "image/svg+xml; charset=utf-8");
      assert.equal(response.headers.get("cache-control"), NEVER_CACHED, path);
      assert.equal(await response.text(), golden("views", theme), path);
    }
  }));
  // One request to komarev's badge per view: komarev counts it. No token goes to komarev.
  assert.equal(asked.length, 3);
  for (const { url, authorization } of asked) {
    assert.equal(url.origin + url.pathname, "https://komarev.com/ghpvc/");
    assert.equal(url.searchParams.get("username"), "NahuelMosse");
    assert.equal(authorization, null);
  }

  // The count is the badge's last number, commas and all.
  const badge = (n) => async () => new Response(`<svg><text>Profile views</text><text>${n}</text></svg>`, { status: 200 });
  for (const [shown, drawn] of [["7", "7"], ["12,345", "12,345"], ["1,234,567", "1,234,567"]]) {
    const response = await withFetch(badge(shown), () => ask("/api/profile/views.svg"));
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(`<title>Profile views: ${drawn}</title>[\\s\\S]*>${drawn}</text>`));
  }
});

test("a komarev failure answers 503 with Retry-After 300 @PW-8-ASM-03", async () => {
  const failures = {
    "error status": async () => new Response("down", { status: 500 }),
    "rate limited": async () => new Response("slow down", { status: 429 }),
    unreachable: async () => {
      throw new TypeError("fetch failed");
    },
    "no number": async () => new Response("<svg><text>Profile views</text></svg>", { status: 200 }),
    empty: async () => new Response("", { status: 200 }),
  };
  for (const [name, fetchImpl] of Object.entries(failures)) {
    const response = await withFetch(fetchImpl, () => ask("/api/profile/views.svg"));
    assert.equal(response.status, 503, name);
    assert.equal(response.headers.get("retry-after"), "300", name);
    assert.equal(response.headers.get("cache-control"), "no-store", name);
    assert.equal(response.headers.get("content-type"), TEXT, name);
  }
});

test("the other widgets keep their 30-minute cache, max-age 1800 and stale 86400 @PW-8-S1 @PW-8-ASM-04", async () => {
  await withToken(TOKEN, () => withFetch(publicFetch(), async () => {
    for (const name of ["streak", "heatmap", "skyline", "building", "npm", "npm-http-attack", "repo-Portfolio", "tool-motion-audit"]) {
      const response = await ask(`/api/profile/${name}.svg`);
      assert.equal(response.status, 200, name);
      assert.equal(response.headers.get("cache-control"), WIDGET_CACHE, name);
    }
  }));
});
