import { profileUser } from "./github.mjs";

// komarev.com counts the profile's views through the README's invisible pixel, which GitHub's image proxy asks for on
// every view. This reads its badge, which komarev does not count unless GitHub's image proxy asks, and returns the total.
export async function profileViews() {
  const response = await fetch(`https://komarev.com/ghpvc/?username=${encodeURIComponent(profileUser())}&style=flat-square`);
  if (!response.ok) throw new Error(`komarev: ${response.status}`);
  const shown = [...(await response.text()).matchAll(/>(\d{1,3}(?:,\d{3})*)</g)].at(-1)?.[1];
  if (!shown) throw new Error("komarev: the badge carries no number");
  return Number(shown.replaceAll(",", ""));
}
