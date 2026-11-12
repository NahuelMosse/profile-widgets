import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../api/profile/[name].mjs";
import { respond } from "../src/modules/widgets/presentation/respond.mjs";
import { widgetNames } from "../src/modules/widgets/domain/draw.mjs";
import * as github from "../src/modules/widgets/data/github.mjs";
import * as npm from "../src/modules/widgets/data/npm.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };
import { NOW } from "./support/stub-fetch.mjs";

const fetchers = { ...github, ...npm };
const ask = (path) => GET(new Request(new URL(path, "https://widgets.example")));
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

const throwingFetchers = Object.fromEntries(Object.keys(fetchers).map((key) => [key, () => { throw new Error(`${key} must not be called`); }]));

test("an unknown widget or theme answers 404 naming the valid ones @PW-8-S2 @PW-1-ASM-04", async () => {
  const names = widgetNames(lists);
  const attempts = [["nope", "dark"], ["visits", "dark"], ["streak", "sepia"], ["streak", ""], ["constructor", "dark"], ["<script>", "dark"], ["streak", "<script>"]];
  for (const [name, theme] of attempts) {
    const answer = await respond(name, theme, throwingFetchers, NOW);
    assert.equal(answer.status, 404, `${name} ${theme}`);
    assert.deepEqual(answer.headers, { "Content-Type": TEXT });
    assert.equal(answer.body, `Unknown widget or theme.\nWidgets: ${names.join(", ")}\nThemes: dark, light\n`);
  }
  for (const input of [[], [null], [{}], [undefined, "dark"], [5, "dark"]]) {
    const answer = await respond(...input);
    assert.equal(answer.status, 404);
    assert.equal(answer.headers["Content-Type"], TEXT);
  }

  for (const path of ["/api/profile/nope.svg", "/api/profile/visits.svg", "/api/profile/streak.svg?theme=sepia", "/api/profile/%E0%A4%A.svg", "/api/profile/", "/api/profile/streak.svg.svg"]) {
    const response = await withFetch(() => { throw new Error("no request expected"); }, () => ask(path));
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("content-type"), TEXT);
    assert.match(await response.text(), /^Unknown widget or theme\.\nWidgets: streak, heatmap/);
  }
});
