import { profileUser } from "./github.mjs";

// komarev.com counts a profile's views and its badge carries the total. It has no read-only endpoint, so the views widget
// is the counter itself. komarev counts a request only when it comes from GitHub's image proxy (its User-Agent is
// `github-camo (…)`); others read the count without adding to it. The widget passes on the User-Agent of the view it
// answers, so a README view is counted.
export async function profileViews(userAgent) {
  const response = await fetch(`https://komarev.com/ghpvc/?username=${encodeURIComponent(profileUser())}&style=flat-square`, userAgent ? { headers: { "User-Agent": userAgent } } : {});
  if (!response.ok) throw new Error(`komarev: ${response.status}`);
  const shown = [...(await response.text()).matchAll(/>(\d{1,3}(?:,\d{3})*)</g)].at(-1)?.[1];
  if (!shown) throw new Error("komarev: the badge carries no number");
  return Number(shown.replaceAll(",", ""));
}
