import {
  drawBuilding, drawHeatmap, drawNpm, drawNpmPackage, drawRepoCard, drawSkyline, drawStreak, drawToolCard,
} from "../../src/modules/widgets/domain/draw.mjs";
import * as github from "../../src/modules/widgets/data/github.mjs";
import * as npm from "../../src/modules/widgets/data/npm.mjs";
import lists from "../../src/modules/widgets/data/repos.json" with { type: "json" };
import { fixtureFetch, NOW, TOKEN } from "./stub-fetch.mjs";

// Every README widget drawn from the recorded GitHub and npm answers: name -> (theme) -> SVG.
export async function recordedWidgets() {
  globalThis.fetch = fixtureFetch;
  process.env.GITHUB_TOKEN = TOKEN;
  const today = NOW.toISOString().slice(0, 10);
  const calendar = await github.calendar();
  const merged = await github.mergedPullRequests();
  const repos = await github.recentRepos();
  const events = await github.publicEvents();
  const packages = await Promise.all(lists.npm.map((p) => npm.npmPackage(p, today)));
  const widgets = {
    streak: (theme) => drawStreak(theme, { calendar, merged }),
    heatmap: (theme) => drawHeatmap(theme, { calendar }),
    skyline: (theme) => drawSkyline(theme, { calendar }),
    building: (theme) => drawBuilding(theme, { repos, events, descriptions: lists.repos, user: github.profileUser(), now: NOW }),
    npm: (theme) => drawNpm(theme, { packages, today }),
  };
  for (const [index, pkg] of packages.entries()) {
    widgets[`npm-${pkg.p}`] = (theme) => drawNpmPackage(theme, { pkg, today, index });
    const repo = await github.repo(pkg.p);
    widgets[`tool-${pkg.p}`] = (theme) => drawToolCard(theme, { name: pkg.p, description: lists.repos[pkg.p]?.description, repo, index });
  }
  for (const [index, name] of lists.featured.entries()) {
    const repo = await github.repo(name);
    widgets[`repo-${name}`] = (theme) => drawRepoCard(theme, { repo, description: lists.repos[name]?.description, index });
  }
  return widgets;
}
