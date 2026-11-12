import { existsSync, readFileSync } from "node:fs";

const fixtures = new URL("../fixtures/", import.meta.url);
const fixturePath = (name) => new URL(`${name}.json`, fixtures);
const read = (name) => JSON.parse(readFileSync(fixturePath(name), "utf8"));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const NOW = new Date("2026-11-11T16:43:58.000Z");
export const TOKEN = "test-token";

// Answers the GitHub and npm requests the widgets make with the answers recorded in test/fixtures.
export async function fixtureFetch(input, init = {}) {
  const url = new URL(typeof input === "string" ? input : input.url);
  const { hostname, pathname } = url;
  if (hostname === "api.github.com") {
    if (pathname === "/graphql") return json(read("github-user"));
    if (pathname === "/search/issues") return json(read("github-merged"));
    if (pathname.endsWith("/events/public")) return json(read("github-events"));
    const repo = pathname.match(/^\/repos\/NahuelMosse\/([^/]+)$/)?.[1];
    if (repo) return existsSync(fixturePath(`github-repo-${repo}`)) ? json(read(`github-repo-${repo}`)) : json({ message: "Not Found" }, 404);
  }
  if (hostname === "registry.npmjs.org") return json(read(`npm-registry-${pathname.slice(1)}`));
  if (hostname === "api.npmjs.org") return json(read(`npm-downloads-${pathname.split("/").at(-1)}`));
  if (hostname === "komarev.com") return new Response(read("komarev-badge").body, { status: 200, headers: { "content-type": "image/svg+xml" } });
  throw new Error(`no fixture for ${init.method || "GET"} ${url}`);
}
