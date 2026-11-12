import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseContributionsPage } from "../src/modules/widgets/domain/contributions-page.mjs";
import { contributionsPage, recordedCalendar } from "./support/public-fetch.mjs";

const page = JSON.parse(readFileSync(new URL("./fixtures/github-contributions.json", import.meta.url), "utf8")).body;

test("the profile's contributions page gives each day's count and their sum @PW-7-S1 @PW-7-ASM-01", () => {
  const calendar = parseContributionsPage(page);
  const days = calendar.weeks.flatMap((week) => week.contributionDays);
  // The page recorded on 2026-11-12 says "6,743 contributions in the last year" over 369 days.
  assert.equal(calendar.totalContributions, 6743);
  assert.equal(days.length, 369);
  assert.deepEqual(days[0], { date: "2025-11-09", contributionCount: 0, weekday: 0 });
  assert.equal(days.at(-1).date, "2026-11-12");
  assert.deepEqual(days.find((d) => d.date === "2026-01-25"), { date: "2026-01-25", contributionCount: 2, weekday: 0 });
  assert.equal(days.find((d) => d.date === "2026-04-12").contributionCount, 1);
  assert.equal(days.reduce((sum, d) => sum + d.contributionCount, 0), 6743);

  // Days are in order, a week starts on Sunday and holds at most seven.
  assert.deepEqual(days.map((d) => d.date), [...days.map((d) => d.date)].sort());
  for (const week of calendar.weeks) {
    assert.ok(week.contributionDays.length >= 1 && week.contributionDays.length <= 7);
    week.contributionDays.forEach((d, i) => i > 0 && assert.equal(d.weekday, week.contributionDays[i - 1].weekday + 1));
    for (const d of week.contributionDays) assert.equal(d.weekday, new Date(`${d.date}T00:00:00Z`).getUTCDay());
  }
  assert.ok(calendar.weeks.slice(1).every((week) => week.contributionDays[0].weekday === 0));

  // The same calendar GitHub's GraphQL gives, when written as the page.
  assert.deepEqual(parseContributionsPage(contributionsPage()), recordedCalendar);

  // Counts over a thousand carry a comma; a single one is "contribution".
  const big = { totalContributions: 1235, weeks: [{ contributionDays: [{ date: "2026-11-01", contributionCount: 1234, weekday: 0 }, { date: "2026-11-02", contributionCount: 1, weekday: 1 }] }] };
  assert.deepEqual(parseContributionsPage(contributionsPage(big)), big);
});

test("a page whose day cells do not all carry a count is refused @PW-7-ASM-01 @PW-7-ASM-03", () => {
  assert.throws(() => parseContributionsPage(""), /contributions page/);
  assert.throws(() => parseContributionsPage("<html><body>Sign in to GitHub</body></html>"), /contributions page/);
  assert.throws(() => parseContributionsPage(JSON.stringify({ errors: [{ message: "bad" }] })), /contributions page/);

  // A cell without its tooltip.
  const withoutTip = contributionsPage().replace(/<tool-tip [^>]*for="contribution-day-component-3-10"[^>]*>[^<]*<\/tool-tip>/, "");
  assert.notEqual(withoutTip, contributionsPage());
  assert.throws(() => parseContributionsPage(withoutTip), /contributions page/);

  // A tooltip whose text no longer reads as a count.
  const reworded = contributionsPage().replace(/>No contributions on 2025-11-09\.</, ">Nothing on 2025-11-09.<");
  assert.notEqual(reworded, contributionsPage());
  assert.throws(() => parseContributionsPage(reworded), /contributions page/);

  // A cell whose date is not a date.
  const badDate = contributionsPage().replace('data-date="2025-11-09"', 'data-date="soon"');
  assert.throws(() => parseContributionsPage(badDate), /contributions page/);
});
