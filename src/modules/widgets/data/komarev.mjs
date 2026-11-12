import { profileUser } from "./github.mjs";

// komarev.com counts a profile's views: each request of its badge is one view, and the badge carries the new total.
// It has no read-only endpoint, so the views widget is the counter itself.
export async function profileViews() {
  const response = await fetch(`https://komarev.com/ghpvc/?username=${encodeURIComponent(profileUser())}&style=flat-square`);
  if (!response.ok) throw new Error(`komarev: ${response.status}`);
  const shown = [...(await response.text()).matchAll(/>(\d{1,3}(?:,\d{3})*)</g)].at(-1)?.[1];
  if (!shown) throw new Error("komarev: the badge carries no number");
  return Number(shown.replaceAll(",", ""));
}
