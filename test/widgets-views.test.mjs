import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { drawViews, parseWidget, widgetNames } from "../src/modules/widgets/domain/draw.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };

const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");

test("views is a live widget, drawn as the fourth chip of the links row, 252 by 48 in the 1012 column @PW-8-S2 @PW-8-ASM-02 @PW-1-ASM-02", () => {
  assert.deepEqual(widgetNames(lists), [
    "streak", "heatmap", "skyline", "building", "npm", "views",
    "npm-motion-audit", "npm-http-attack", "npm-migrations-safe",
    "repo-ClubNahuelMosse", "repo-cebador-landing", "repo-Portfolio",
    "tool-motion-audit", "tool-http-attack", "tool-migrations-safe",
  ]);
  assert.deepEqual(parseWidget("views", lists), { kind: "views" });
  // The chip the README draws today, a quarter of the 1012 px column: 252 x 48, its content inset to meet the column's edge.
  for (const theme of ["dark", "light"]) assert.equal(drawViews(theme, { count: 1485 }), golden("views", theme), theme);
  assert.match(drawViews("dark", { count: 1234567 }), /<title>Profile views: 1,234,567<\/title>[\s\S]*>1,234,567<\/text>/);
  assert.match(drawViews("dark", { count: 0 }), /<svg[^>]* width="252" height="48"[\s\S]*>0<\/text>/);
  assert.throws(() => drawViews("dark", {}), TypeError);
  assert.deepEqual(parseWidget("streak", lists), { kind: "streak" });
  assert.deepEqual(parseWidget("npm", lists), { kind: "npm" });
  assert.deepEqual(parseWidget("npm-http-attack", lists), { kind: "npm-package", arg: "http-attack" });
  assert.deepEqual(parseWidget("repo-Portfolio", lists), { kind: "repo", arg: "Portfolio" });
  assert.deepEqual(parseWidget("tool-motion-audit", lists), { kind: "tool", arg: "motion-audit" });
  for (const name of ["repo-http-attack", "tool-Portfolio", "npm-Portfolio", "repo-", "npm-", "constructor", "__proto__", "toString", "", undefined, null, 5])
    assert.equal(parseWidget(name, lists), null, String(name));
});
