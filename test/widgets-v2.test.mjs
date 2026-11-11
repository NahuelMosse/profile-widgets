import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { widgetNames } from "../src/modules/widgets/domain/draw.mjs";
import { THEME_NAMES } from "../src/modules/widgets/domain/themes.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };
import { recordedWidgets } from "./support/recorded-widgets.mjs";

const golden = (name, theme) => readFileSync(new URL(`./golden-v2/${name}.${theme}.svg`, import.meta.url), "utf8");
const FULL_WIDTH = 1012;
const THIRD_WIDTH = 337;
const THIRD_HEIGHT = 176;

test("each widget draws what the profile's new live.mjs draws, in both themes, full width 1012 and thirds 337 by 176 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", async () => {
  const widgets = await recordedWidgets();
  assert.deepEqual(Object.keys(widgets).sort(), widgetNames(lists).sort());
  for (const [name, draw] of Object.entries(widgets)) {
    for (const theme of THEME_NAMES) {
      const svg = draw(theme);
      assert.equal(svg, golden(name, theme), `${name}.${theme}`);
      const [, width, height] = svg.match(/^<svg [^>]*width="(\d+)" height="(\d+)"/);
      const third = /^(repo|tool|npm)-/.test(name);
      if (third) assert.deepEqual([Number(width), Number(height)], [THIRD_WIDTH, THIRD_HEIGHT], name);
      else assert.equal(Number(width), FULL_WIDTH, name);
    }
  }
});

test("the repository stays at grade mvp @PW-2-ASM-02", () => {
  const kit = JSON.parse(readFileSync(new URL("../.claude/kit.json", import.meta.url), "utf8"));
  assert.equal(kit.grade.level, "mvp");
});
