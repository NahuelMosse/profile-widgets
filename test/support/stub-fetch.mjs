import { existsSync, readFileSync } from "node:fs";

const fixtures = new URL("../fixtures/", import.meta.url);
const fixturePath = (name) => new URL(`${name}.json`, fixtures);
const read = (name) => JSON.parse(readFileSync(fixturePath(name), "utf8"));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const NOW = new Date("2026-11-11T16:43:58.000Z");
export const TOKEN = "test-token";

// Each year's total as its contributions page heads it; a year after the recording has none.
export const recordedYears = read("github-contribution-years").years;
export const yearTotal = (year) => recordedYears[year] ?? 0;

// Each day's count as its year's contributions page writes it, the days with none left out.
export const recordedDays = read("github-contribution-days").days;

// Every day of a year, Jan 1 to Dec 31, with its count: the days after today included, as the page lays them out.
export function yearDays(year, counts = recordedDays[year] ?? {}) {
  const days = [];
  for (let d = new Date(`${year}-01-01T00:00:00Z`); d.getUTCFullYear() === Number(year); d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    days.push({ date, contributionCount: counts[date] ?? 0, weekday: d.getUTCDay() });
  }
  return days;
}

// A cell per day and its tooltip with the count, as the contributions page writes them.
export function dayCells(days) {
  const label = (n) => (n === 0 ? "No contributions" : `${n.toLocaleString("en-US")} contribution${n === 1 ? "" : "s"}`);
  const cells = days.map((day, i) => `<td tabindex="0" data-ix="${i}" style="width: 11px" data-date="${day.date}" id="contribution-day-component-${day.weekday}-${i}" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>`);
  const tips = days.map((day, i) => `<tool-tip id="tooltip-${i}" for="contribution-day-component-${day.weekday}-${i}" popover="manual" class="sr-only position-absolute">${label(day.contributionCount)} on ${day.date}.</tool-tip>`);
  return `<table><tbody><tr>${cells.join("\n")}</tr></tbody></table>\n${tips.join("\n")}\n`;
}

// A year's contributions page as GitHub writes it: headed "N contributions in YYYY", then a cell per day of the year.
export function contributionYearPage(year, total = yearTotal(year)) {
  return `<h2 tabindex="-1" id="js-contribution-activity-description" class="f4 text-normal mb-2">\n  ${total.toLocaleString("en-US")}\n  contribution${total === 1 ? "" : "s"}\n  in ${year}\n</h2>\n${dayCells(yearDays(year))}`;
}

// Answers the GitHub and npm requests the widgets make with the answers recorded in test/fixtures.
export async function fixtureFetch(input, init = {}) {
  const url = new URL(typeof input === "string" ? input : input.url);
  const { hostname, pathname } = url;
  if (hostname === "api.github.com") {
    if (pathname === "/graphql") return json(read("github-user"));
    if (pathname === "/search/issues") return json(read("github-merged"));
    if (pathname.endsWith("/events/public")) return json(read("github-events"));
    if (pathname === "/users/NahuelMosse") return json(read("github-profile"));
    const repo = pathname.match(/^\/repos\/NahuelMosse\/([^/]+)$/)?.[1];
    if (repo) return existsSync(fixturePath(`github-repo-${repo}`)) ? json(read(`github-repo-${repo}`)) : json({ message: "Not Found" }, 404);
  }
  if (hostname === "github.com" && pathname === "/users/NahuelMosse/contributions" && url.searchParams.has("from")) {
    const page = contributionYearPage(url.searchParams.get("from").slice(0, 4));
    return new Response(page, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (hostname === "registry.npmjs.org") return json(read(`npm-registry-${pathname.slice(1)}`));
  if (hostname === "api.npmjs.org") return json(read(`npm-downloads-${pathname.split("/").at(-1)}`));
  if (hostname === "komarev.com") return new Response(read("komarev-badge").body, { status: 200, headers: { "content-type": "image/svg+xml" } });
  throw new Error(`no fixture for ${init.method || "GET"} ${url}`);
}
