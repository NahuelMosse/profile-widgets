import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContributionsPage } from "../src/modules/widgets/domain/contributions-page.mjs";
import { contributionsPage, recordedCalendar } from "./support/public-fetch.mjs";

test("a tooltip written across lines still gives its day's count @PW-7-ASM-01", () => {
  const page = contributionsPage().replace(/(<tool-tip [^>]*>)([^<]*)(<\/tool-tip>)/g, "$1\n      $2\n    $3");
  assert.notEqual(page, contributionsPage());
  assert.deepEqual(parseContributionsPage(page), recordedCalendar);
});
