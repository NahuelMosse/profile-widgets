import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the repository stays at grade mvp @PW-2-ASM-02", () => {
  const kit = JSON.parse(readFileSync(new URL("../.claude/kit.json", import.meta.url), "utf8"));
  assert.equal(kit.grade.level, "mvp");
});
