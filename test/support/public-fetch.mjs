import { readFileSync } from "node:fs";
import { fixtureFetch } from "./stub-fetch.mjs";

const recorded = JSON.parse(readFileSync(new URL("../fixtures/github-user.json", import.meta.url), "utf8")).data.user;

export const recordedCalendar = recorded.contributionsCollection.contributionCalendar;
export const recordedRepos = recorded.repositories.nodes;

// The profile's contributions page as GitHub writes it: a cell per day and its tooltip with the count.
export function contributionsPage(calendar = recordedCalendar) {
  const days = calendar.weeks.flatMap((week) => week.contributionDays);
  const cells = days.map((day, i) => `<td tabindex="0" data-ix="${i}" style="width: 11px" data-date="${day.date}" id="contribution-day-component-${day.weekday}-${i}" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>`);
  const label = (n) => (n === 0 ? "No contributions" : `${n.toLocaleString("en-US")} contribution${n === 1 ? "" : "s"}`);
  const tips = days.map((day, i) => `<tool-tip id="tooltip-${i}" for="contribution-day-component-${day.weekday}-${i}" popover="manual" class="sr-only position-absolute">${label(day.contributionCount)} on ${day.date}.</tool-tip>`);
  return `<h2 class="f4 text-normal mb-2">\n  ${calendar.totalContributions.toLocaleString("en-US")}\n  contributions\n  in the last year\n</h2>\n<table><tbody><tr>${cells.join("\n")}</tr></tbody></table>\n${tips.join("\n")}\n`;
}

// The owner's repos as the public REST API lists them, most recently pushed first, with a fork among them.
export function restRepos(nodes = recordedRepos) {
  const listed = nodes.map((r) => ({
    name: r.name,
    fork: false,
    description: r.description,
    stargazers_count: r.stargazerCount,
    pushed_at: r.pushedAt,
    language: r.primaryLanguage?.name ?? null,
  }));
  return [...listed.slice(0, 1), { name: "Sunshine", fork: true, description: "A fork", stargazers_count: 0, pushed_at: "2026-11-11T23:00:00Z", language: "C++" }, ...listed.slice(1)];
}

// Answers like fixtureFetch, plus GitHub's public contributions page and repos list; records each request and whether it
// carried a token. `override(url, init)` may answer a request first (a failure to inject).
export function publicFetch({ requests = [], override } = {}) {
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const authorization = new Headers(init.headers ?? {}).get("authorization");
    requests.push({ at: `${url.hostname}${url.pathname.replace(/range\/[^/]+/, "range")}`, token: Boolean(authorization) });
    const injected = override && (await override(url, init));
    if (injected) return injected;
    if (url.hostname === "github.com" && url.pathname === "/users/NahuelMosse/contributions") {
      return new Response(contributionsPage(), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.hostname === "api.github.com" && url.pathname === "/users/NahuelMosse/repos") {
      return new Response(JSON.stringify(restRepos()), { status: 200, headers: { "content-type": "application/json" } });
    }
    return fixtureFetch(input, init);
  };
}
