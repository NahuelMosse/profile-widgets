import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContributionsPage } from "../src/modules/widgets/domain/contributions-page.mjs";
import { contributionsPage } from "./support/public-fetch.mjs";

test("a cell dated with the shape of a date but no calendar day is refused @PW-7-ASM-01", () => {
  const page = contributionsPage().replace('data-date="2025-11-09"', 'data-date="2025-13-45"');
  assert.notEqual(page, contributionsPage());
  assert.throws(() => parseContributionsPage(page), /contributions page changed: a cell dated "2025-13-45"/);
});
