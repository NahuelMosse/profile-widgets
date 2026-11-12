import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as handler from "../api/profile/[name].mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import { TOKEN } from "./support/stub-fetch.mjs";
import { publicFetch, recordedCalendar, recordedRepos } from "./support/public-fetch.mjs";

const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");
const ask = (path) => handler.GET(new Request(new URL(path, "https://widgets.example")));
const PAGE = "github.com/users/NahuelMosse/contributions";
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

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

test("the calendar comes from the public profile page with no token @PW-7-S1 @PW-7-ASM-01", async () => {
  const requests = [];
  await withToken(TOKEN, () => withFetch(publicFetch({ requests }), async () => {
    assert.deepEqual(await github.calendar(), recordedCalendar);
    assert.deepEqual(requests, [{ at: PAGE, token: false }]);

    // The skyline, heatmap and streak draw from it exactly as they drew from GraphQL.
    for (const name of ["skyline", "heatmap", "streak"]) {
      requests.length = 0;
      const response = await ask(`/api/profile/${name}.svg?theme=dark`);
      assert.equal(response.status, 200, name);
      assert.equal(await response.text(), golden(name, "dark"), name);
      assert.ok(requests.every((r) => !r.token && r.at !== "api.github.com/graphql"), `${name}: ${JSON.stringify(requests)}`);
    }
  }));
});

test("every datum is asked of GitHub's public interfaces first, with no token @PW-7-S2 @PW-7-ASM-02", async () => {
  const requests = [];
  await withToken(TOKEN, () => withFetch(publicFetch({ requests }), async () => {
    assert.equal(typeof (await github.mergedPullRequests()), "number");
    assert.equal((await github.repo("Portfolio")).name, "Portfolio");
    // The owner's repos, most recently pushed first, without forks: what GraphQL listed.
    assert.deepEqual(await github.recentRepos(), recordedRepos);
    assert.ok((await github.publicEvents()).length > 0);
    assert.deepEqual(requests, [
      { at: "api.github.com/search/issues", token: false },
      { at: "api.github.com/repos/NahuelMosse/Portfolio", token: false },
      { at: "api.github.com/users/NahuelMosse/repos", token: false },
      { at: "api.github.com/users/NahuelMosse/events/public", token: false },
    ]);

    // The public queries ask what the token ones asked: merged PRs in public repos, the owner's repos by last push.
    const asked = [];
    await withFetch(async (input, init) => {
      asked.push(String(input));
      return publicFetch()(input, init);
    }, async () => {
      await github.mergedPullRequests();
      await github.recentRepos();
    });
    assert.match(decodeURIComponent(asked[0]), /q=is:pr is:merged is:public author:NahuelMosse/);
    const repos = new URL(asked[1]);
    assert.equal(repos.searchParams.get("type"), "owner");
    assert.equal(repos.searchParams.get("sort"), "pushed");
    assert.equal(repos.searchParams.get("per_page"), "100");
  }));
});

test("the token query answers when the public one fails @PW-7-S3 @PW-7-ASM-03", async () => {
  const failures = {
    "page 500": (url) => url.hostname === "github.com" && new Response("oops", { status: 500 }),
    "page 429": (url) => url.hostname === "github.com" && new Response("slow down", { status: 429 }),
    "page unreachable": (url) => {
      if (url.hostname === "github.com") throw new TypeError("fetch failed");
    },
    "page changed": (url) => url.hostname === "github.com" && new Response("<html><body>A new profile</body></html>", { status: 200 }),
  };
  for (const [name, override] of Object.entries(failures)) {
    const requests = [];
    await withToken(TOKEN, () => withFetch(publicFetch({ requests, override }), async () => {
      assert.deepEqual(await github.calendar(), recordedCalendar, name);
      assert.deepEqual(requests, [{ at: PAGE, token: false }, { at: "api.github.com/graphql", token: true }], name);
    }));
  }

  // A REST datum the public API refuses (rate limit, outage) is asked again with the token.
  const limited = (path) => (url, init) => {
    const anonymous = !new Headers(init.headers ?? {}).get("authorization");
    if (anonymous && url.pathname.startsWith(path)) return json({ message: "API rate limit exceeded" }, 403);
  };
  const cases = [
    ["/search/issues", () => github.mergedPullRequests(), (v) => assert.equal(typeof v, "number")],
    ["/repos/NahuelMosse/Portfolio", () => github.repo("Portfolio"), (v) => assert.equal(v.name, "Portfolio")],
    ["/users/NahuelMosse/events", () => github.publicEvents(), (v) => assert.ok(v.length > 0)],
  ];
  for (const [path, call, check] of cases) {
    const requests = [];
    await withToken(TOKEN, () => withFetch(publicFetch({ requests, override: limited(path) }), async () => {
      check(await call());
      assert.deepEqual(requests.map((r) => r.token), [false, true], path);
      assert.equal(requests[0].at, requests[1].at, path);
    }));
  }

  // The repos list falls back to the GraphQL query it had.
  const requests = [];
  const reposDown = (url) => url.pathname === "/users/NahuelMosse/repos" && new Response("{}", { status: 502 });
  await withToken(TOKEN, () => withFetch(publicFetch({ requests, override: reposDown }), async () => {
    assert.deepEqual(await github.recentRepos(), recordedRepos);
    assert.deepEqual(requests, [{ at: "api.github.com/users/NahuelMosse/repos", token: false }, { at: "api.github.com/graphql", token: true }]);
  }));

  // When both fail, the widget is a 503.
  const allDown = (url) => (url.hostname === "github.com" || url.pathname === "/graphql") && new Response("{}", { status: 500 });
  await withToken(TOKEN, () => withFetch(publicFetch({ override: allDown }), async () => {
    assert.equal((await ask("/api/profile/heatmap.svg")).status, 503);
  }));
});

test("with no token the public interfaces still answer, and their failure is a 503 with Retry-After 300 @PW-7-ASM-04", async () => {
  const requests = [];
  await withToken(undefined, () => withFetch(publicFetch({ requests }), async () => {
    for (const name of ["streak", "skyline", "building", "repo-Portfolio"]) {
      const response = await ask(`/api/profile/${name}.svg?theme=light`);
      assert.equal(response.status, 200, name);
      assert.equal(await response.text(), golden(name, "light"), name);
    }
    assert.ok(requests.length > 0 && requests.every((r) => !r.token && r.at !== "api.github.com/graphql"));
  }));

  const down = (url) => url.hostname === "github.com" && new Response("oops", { status: 503 });
  requests.length = 0;
  await withToken(undefined, () => withFetch(publicFetch({ requests, override: down }), async () => {
    const response = await ask("/api/profile/streak.svg");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "300");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(requests.every((r) => !r.token && r.at !== "api.github.com/graphql"));
  }));
});

test("a repo the public API does not find is not asked again with the token @PW-7-ASM-05", async () => {
  const requests = [];
  await withToken(TOKEN, () => withFetch(publicFetch({ requests }), async () => {
    assert.equal(await github.repo("not-a-repo"), null);
    assert.deepEqual(requests, [{ at: "api.github.com/repos/NahuelMosse/not-a-repo", token: false }]);
  }));
});
