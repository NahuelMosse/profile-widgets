import { test } from "node:test";
import assert from "node:assert/strict";
import * as handler from "../api/profile/[name].mjs";
import { fixtureFetch } from "./support/stub-fetch.mjs";

async function withFetch(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("the views widget asks komarev with the User-Agent of the view it answers, github-camo included @PW-9-S1 @PW-9-ASM-01", async () => {
  const sent = [];
  const recording = (input, init = {}) => {
    sent.push(new Headers(init.headers ?? {}).get("user-agent"));
    return fixtureFetch(input, init);
  };
  const ask = (headers) => handler.GET(new Request("https://widgets.example/api/profile/views.svg", { headers }));
  await withFetch(recording, async () => {
    // GitHub's image proxy asks for the chip: komarev sees the proxy and counts the view.
    assert.equal((await ask({ "user-agent": "github-camo (876de43e)" })).status, 200);
    // Anyone else reads the count with their own User-Agent, and komarev decides not to count it.
    assert.equal((await ask({ "user-agent": "curl/8.9.1" })).status, 200);
    // A request with no User-Agent sends none of its own.
    assert.equal((await ask({})).status, 200);
    assert.equal((await handler.HEAD(new Request("https://widgets.example/api/profile/views.svg", { method: "HEAD", headers: { "user-agent": "github-camo (abc)" } }))).status, 200);
  });
  assert.deepEqual(sent, ["github-camo (876de43e)", "curl/8.9.1", null, "github-camo (abc)"]);
});
