import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { widgetNames } from "../src/modules/widgets/domain/draw.mjs";
import { THEME_NAMES } from "../src/modules/widgets/domain/themes.mjs";
import lists from "../src/modules/widgets/data/repos.json" with { type: "json" };
import { recordedWidgets } from "./support/recorded-widgets.mjs";

const golden = (name, theme) => readFileSync(new URL(`./golden-v3/${name}.${theme}.svg`, import.meta.url), "utf8");

test("each widget draws what the profile's live.mjs draws with its widgets aligned, in both themes @PW-5-S1 @PW-5-ASM-01 @PW-4-S1 @PW-4-ASM-01 @PW-2-S1 @PW-2-ASM-01 @PW-1-S1 @PW-1-ASM-01", async () => {
  const widgets = await recordedWidgets();
  assert.deepEqual(Object.keys(widgets).sort(), widgetNames(lists).sort());
  for (const [name, draw] of Object.entries(widgets))
    for (const theme of THEME_NAMES) assert.equal(draw(theme), golden(name, theme), `${name}.${theme}`);
});
