import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWidget, widgetNames } from "../src/modules/widgets/domain/draw.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };

test("views is not a live widget @PW-1-ASM-02", () => {
  assert.deepEqual(widgetNames(lists), [
    "streak", "heatmap", "skyline", "building", "npm",
    "npm-motion-audit", "npm-http-attack", "npm-migrations-safe",
    "repo-ClubNahuelMosse", "repo-cebador-landing", "repo-Portfolio",
    "tool-motion-audit", "tool-http-attack", "tool-migrations-safe",
  ]);
  assert.equal(parseWidget("views", lists), null);
  assert.deepEqual(parseWidget("streak", lists), { kind: "streak" });
  assert.deepEqual(parseWidget("npm", lists), { kind: "npm" });
  assert.deepEqual(parseWidget("npm-http-attack", lists), { kind: "npm-package", arg: "http-attack" });
  assert.deepEqual(parseWidget("repo-Portfolio", lists), { kind: "repo", arg: "Portfolio" });
  assert.deepEqual(parseWidget("tool-motion-audit", lists), { kind: "tool", arg: "motion-audit" });
  for (const name of ["repo-http-attack", "tool-Portfolio", "npm-Portfolio", "repo-", "npm-", "constructor", "__proto__", "toString", "", undefined, null, 5])
    assert.equal(parseWidget(name, lists), null, String(name));
});
