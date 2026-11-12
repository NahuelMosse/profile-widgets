import { parseContributionsPage } from "../domain/contributions-page.mjs";

const API = "https://api.github.com";
const SITE = "https://github.com";

export const profileUser = () => process.env.PROFILE_USER || "NahuelMosse";

function authorization() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");
  return `bearer ${token}`;
}

// GitHub's public interfaces answer first, with no token: the profile's contributions page and the public REST API.
// The token query answers when they fail (an error status, the rate limit of anonymous requests, a page that changed).
// A fine-grained token sees only the repos it was granted, so its calendar leaves out the rest; the public page does not.
async function publicFirst(publicCall, tokenCall) {
  try {
    return await publicCall();
  } catch (error) {
    if (!process.env.GITHUB_TOKEN) throw error;
    return tokenCall();
  }
}

async function graphql(query, variables) {
  const response = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { Authorization: authorization(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`graphql: ${response.status}`);
  const body = await response.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

// A 404 is an answer (it does not exist), not a failure: it is not asked again with the token.
async function rest(path, { token = true } = {}) {
  const response = await fetch(`${API}${path}`, token ? { headers: { Authorization: authorization() } } : {});
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

const publicRest = (path) => publicFirst(() => rest(path, { token: false }), () => rest(path));

// The last year of contributions, day by day, as the profile shows them.
export async function calendar() {
  return publicFirst(
    async () => {
      const response = await fetch(`${SITE}/users/${encodeURIComponent(profileUser())}/contributions`);
      if (!response.ok) throw new Error(`contributions page: ${response.status}`);
      return parseContributionsPage(await response.text());
    },
    async () => {
      const { user } = await graphql(`query($login:String!){user(login:$login){
  contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount weekday}}}}}}`, { login: profileUser() });
      return user.contributionsCollection.contributionCalendar;
    },
  );
}

// Merged PRs come from the search API restricted to public repos (`is:public`), so the number is the same whichever token
// runs this; authored by the user, so no bot's PR counts.
export async function mergedPullRequests() {
  const query = encodeURIComponent(`is:pr is:merged is:public author:${profileUser()}`);
  return (await publicRest(`/search/issues?q=${query}&per_page=1`)).total_count;
}

// A public repo's name, description, stars, last push and language; null when it does not exist.
export async function repo(name) {
  const found = await publicRest(`/repos/${profileUser()}/${encodeURIComponent(name)}`);
  if (!found) return null;
  return {
    name: found.name,
    description: found.description,
    stargazerCount: found.stargazers_count,
    pushedAt: found.pushed_at,
    primaryLanguage: found.language ? { name: found.language } : null,
  };
}

// The public repos the user owns, without forks, most recently pushed first.
export async function recentRepos() {
  return publicFirst(
    async () => {
      const repos = await rest(`/users/${profileUser()}/repos?type=owner&sort=pushed&per_page=100`, { token: false });
      if (!repos) throw new Error("repos not found");
      return repos.filter((r) => !r.fork).map((r) => ({
        name: r.name,
        description: r.description,
        stargazerCount: r.stargazers_count,
        pushedAt: r.pushed_at,
        primaryLanguage: r.language ? { name: r.language } : null,
      }));
    },
    async () => {
      const { user } = await graphql(`query($login:String!){user(login:$login){
  repositories(ownerAffiliations:OWNER,isFork:false,first:100,privacy:PUBLIC,orderBy:{field:PUSHED_AT,direction:DESC}){nodes{
    name description stargazerCount pushedAt primaryLanguage{name}}}}}`, { login: profileUser() });
      return user.repositories.nodes;
    },
  );
}

export async function publicEvents() {
  const events = await publicRest(`/users/${profileUser()}/events/public?per_page=100`);
  if (!events) throw new Error("public events not found");
  return events;
}
