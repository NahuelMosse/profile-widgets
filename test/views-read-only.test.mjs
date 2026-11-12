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

test("the views widget only reads komarev's count, passing on no User-Agent @PW-10-S1 @PW-10-ASM-01 @PW-9-S1", async () => {
  const sent = [];
  const recording = (input, init = {}) => {
    sent.push(new Headers(init.headers ?? {}).get("user-agent"));
    return fixtureFetch(input, init);
  };
  const ask = (headers, method = "GET") => handler[method](new Request("https://widgets.example/api/profile/views.svg", { method, headers }));
  await withFetch(recording, async () => {
    // The README's pixel counts the view; the chip, even when GitHub's image proxy asks for it, only reads the count.
    for (const [headers, method] of [[{ "user-agent": "github-camo (876de43e)" }, "GET"], [{ "user-agent": "curl/8.9.1" }, "GET"], [{}, "GET"], [{ "user-agent": "github-camo (abc)" }, "HEAD"]]) {
      const response = await ask(headers, method);
      assert.equal(response.status, 200);
      if (method === "GET") assert.match(await response.text(), /<title>Profile views: 1,485<\/title>/);
    }
  });
  assert.deepEqual(sent, [null, null, null, null]);
});
