const API = "https://api.github.com";

export const profileUser = () => process.env.PROFILE_USER || "NahuelMosse";

function authorization() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");
  return `bearer ${token}`;
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

async function rest(path) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: authorization() } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

// The last year of contributions, day by day.
export async function calendar() {
  const { user } = await graphql(`query($login:String!){user(login:$login){
  contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount weekday}}}}}}`, { login: profileUser() });
  return user.contributionsCollection.contributionCalendar;
}

// Merged PRs come from the search API restricted to public repos (`is:public`), so the number is the same whichever token
// runs this; authored by the user, so no bot's PR counts.
export async function mergedPullRequests() {
  const query = encodeURIComponent(`is:pr is:merged is:public author:${profileUser()}`);
  return (await rest(`/search/issues?q=${query}&per_page=1`)).total_count;
}

// A public repo's name, description, stars, last push and language; null when it does not exist.
export async function repo(name) {
  const found = await rest(`/repos/${profileUser()}/${encodeURIComponent(name)}`);
  if (!found) return null;
  return {
    name: found.name,
    description: found.description,
    stargazerCount: found.stargazers_count,
    pushedAt: found.pushed_at,
    primaryLanguage: found.language ? { name: found.language } : null,
  };
}

// The public repos the user owns, most recently pushed first.
export async function recentRepos() {
  const { user } = await graphql(`query($login:String!){user(login:$login){
  repositories(ownerAffiliations:OWNER,isFork:false,first:100,privacy:PUBLIC,orderBy:{field:PUSHED_AT,direction:DESC}){nodes{
    name description stargazerCount pushedAt primaryLanguage{name}}}}}`, { login: profileUser() });
  return user.repositories.nodes;
}

export async function publicEvents() {
  const events = await rest(`/users/${profileUser()}/events/public?per_page=100`);
  if (!events) throw new Error("public events not found");
  return events;
}
