// GitHub's public contributions page (github.com/users/<user>/contributions) read as the calendar GraphQL gives: a cell
// per day (`data-date`, `id`) and a tooltip per cell (`for` = the cell's id) whose text is the day's count.
const CELL = /<td\b[^>]*\bdata-date="([^"]*)"[^>]*>/g;
const TIP = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
const COUNT = /^(No|\d{1,3}(?:,\d{3})*) contributions? on /;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const changed = (why) => new Error(`the contributions page changed: ${why}`);

// Refuses a page whose day cells do not all carry a count: the profile's markup changed and the token query answers.
export function parseContributionsPage(html) {
  const page = String(html);
  const tips = new Map([...page.matchAll(TIP)].map(([, id, text]) => [id, text.trim()]));
  const days = [...page.matchAll(CELL)].map(([cell, date]) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (!DATE.test(date) || Number.isNaN(weekday)) throw changed(`a cell dated "${date}"`);
    const count = tips.get(cell.match(/\bid="([^"]+)"/)?.[1])?.match(COUNT);
    if (!count) throw changed(`the cell of ${date} carries no count`);
    return { date, contributionCount: count[1] === "No" ? 0 : Number(count[1].replaceAll(",", "")), weekday };
  });
  if (days.length === 0) throw changed("no day cells");
  // The page lays the cells out by weekday rows; the calendar runs by date, a week from Sunday.
  days.sort((a, b) => a.date.localeCompare(b.date));
  const weeks = [];
  for (const day of days) {
    if (weeks.length === 0 || day.weekday === 0) weeks.push({ contributionDays: [] });
    weeks.at(-1).contributionDays.push(day);
  }
  return { totalContributions: days.reduce((sum, day) => sum + day.contributionCount, 0), weeks };
}
