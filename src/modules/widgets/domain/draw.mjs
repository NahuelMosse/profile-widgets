import { level, mix, SHADOW, STYLE, themeOf } from "./themes.mjs";

const STATIC_WIDGETS = ["streak", "heatmap", "skyline", "building", "npm"];
const PREFIXED_WIDGETS = [
  { prefix: "npm-", kind: "npm-package", list: "npm" },
  { prefix: "repo-", kind: "repo", list: "featured" },
  { prefix: "tool-", kind: "tool", list: "npm" },
];

export function widgetNames(lists) {
  need(lists, "featured", "npm");
  const { featured, npm } = lists;
  return [...STATIC_WIDGETS, ...npm.map((p) => `npm-${p}`), ...featured.map((r) => `repo-${r}`), ...npm.map((p) => `tool-${p}`)];
}

export function parseWidget(name, lists) {
  if (STATIC_WIDGETS.includes(name)) return { kind: name };
  if (typeof name !== "string") return null;
  const match = PREFIXED_WIDGETS.find(({ prefix }) => name.startsWith(prefix));
  if (!match) return null;
  const arg = name.slice(match.prefix.length);
  return lists[match.list].includes(arg) ? { kind: match.kind, arg } : null;
}

function need(data, ...keys) {
  for (const key of keys) if (data?.[key] == null) throw new TypeError(`missing ${key}`);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const wrap = (t, n) => {
  const lines = [""];
  for (const w of t.split(/\s+/)) {
    if ((lines.at(-1) + " " + w).trim().length > n) lines.push(w);
    else lines[lines.length - 1] = (lines.at(-1) + " " + w).trim();
  }
  return lines;
};
const hair = (T, x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${T.line}" stroke-opacity="${T.lineOp}"/>`;

// One family: every widget is drawn at the size the README shows it at in the 1012 px profile column (a full-width one 1012 wide,
// a third-width one 337), so type reads at the same scale in all of them. Spacing 4 8 12 16 24 32 48;
// type 11 (titles, labels) 13 (body) 20 (names) 30 (stats) 48 (figures) 80 (the counter).
const FULL_WIDTH = 1012;
const PAD = 24, BAND = 48;
const H3 = 176; // height of a third-width card, and of the streak and building cards
const SLOT3 = 337, CARD3 = 325, STEP3 = 6; // three to a row, drawn with no whitespace between them: card i sits STEP3 * i in from its slot's left edge, so the row spans the column with 18 px gutters

// The frame every card shares: a hairline outline, a tinted title band with a red mark (pulsing when `pulse`) and the title in
// 11 px caps, an optional dim note at the band's right.
const card = (T, w, h, text, { right, pulse } = {}) => `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${T.line}" stroke-opacity="${T.lineOp}"/>
<rect x="1" y="1" width="${w - 2}" height="${BAND - 1}" fill="${T.fg}" fill-opacity=".04"/>${hair(T, 1, BAND + 0.5, w - 1, BAND + 0.5)}
<rect x="${PAD}" y="24" width="8" height="8" fill="${T.red}">${pulse ? `<animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/>` : ""}</rect>
<text x="${PAD + 16}" y="32" fill="${T.fg}" font-size="11" letter-spacing="1.5">${esc(text)}</text>${right ? `<text x="${w - PAD}" y="32" text-anchor="end" fill="${T.dim}" font-size="11" letter-spacing="1.5">${esc(right)}</text>` : ""}`;

function svgDocument(w, h, label, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title><style>${STYLE}</style>
${inner}</svg>
`;
}

const daysOf = (calendar) => calendar.weeks.flatMap((w) => w.contributionDays);

// Contribution count to level 1..4 on a log scale of the busiest day; 0 stays 0.
const contributionLevel = (n, max) => (n === 0 ? 0 : Math.min(4, 1 + Math.floor((Math.log(n) / Math.log(max + 1)) * 4)));
const busiestDay = (days) => Math.max(...days.map((d) => d.contributionCount), 1);

// 3D skyline: each day a prism on an oblique grid, its height by contributions, rising week by week.
export function drawSkyline(theme, data) {
  const T = themeOf(theme);
  need(data, "calendar");
  const { calendar } = data;
  const { weeks } = calendar;
  const MAXH = 112;
  const e1 = [(FULL_WIDTH - 2 * PAD - 52) / weeks.length, 3.6], e2 = [-52 / 6, 7]; // one week, one weekday
  const ox = PAD + 52;
  const max = busiestDay(daysOf(calendar));
  const cells = [];
  weeks.forEach((w, wi) => w.contributionDays.forEach((d) => cells.push({ wi, di: d.weekday, n: d.contributionCount, date: d.date })));
  cells.sort((a, b) => a.wi * e1[1] + a.di * e2[1] - (b.wi * e1[1] + b.di * e2[1]) || a.wi - b.wi);
  const hOf = (n) => (n ? 5 + MAXH * Math.sqrt(n / max) : 1.5);
  const oy = BAND + 24 + Math.max(...cells.map((c) => hOf(c.n) - (c.wi * e1[1] + c.di * e2[1])));
  const H = Math.ceil(oy + (weeks.length - 1) * e1[1] + 6 * e2[1] + e1[1] + e2[1] + PAD);
  const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const total = fmt(calendar.totalContributions);
  const prisms = cells.map(({ wi, di, n, date }) => {
    const h = hOf(n);
    const x = ox + wi * e1[0] + di * e2[0], y = oy + wi * e1[1] + di * e2[1];
    const a = [x, y], b = [x + e1[0], y + e1[1]], c = [x + e1[0] + e2[0], y + e1[1] + e2[1]], dd = [x + e2[0], y + e2[1]];
    const top = level(T, contributionLevel(n, max)), side = mix(top, SHADOW, T.shade), front = mix(top, SHADOW, T.shade * 0.55);
    const up = (p) => [p[0], p[1] - h];
    return `<g class="r" style="animation-delay:${(wi * 0.018).toFixed(3)}s"><title>${date}: ${n}</title>`
      + `<polygon points="${P(...dd)} ${P(...c)} ${P(...up(c))} ${P(...up(dd))}" fill="${front}"/>`
      + `<polygon points="${P(...b)} ${P(...c)} ${P(...up(c))} ${P(...up(b))}" fill="${side}"/>`
      + `<polygon points="${P(...up(a))} ${P(...up(b))} ${P(...up(c))} ${P(...up(dd))}" fill="${top}"/></g>`;
  }).join("");
  return svgDocument(FULL_WIDTH, H, `${total} contributions in the last year, as a 3D skyline`, `${card(T, FULL_WIDTH, H, "CONTRIBUTIONS · LAST 12 MONTHS")}
<g class="u"><text x="${FULL_WIDTH - PAD}" y="112" text-anchor="end" fill="${T.red}" font-size="48">${total}</text>
<text x="${FULL_WIDTH - PAD}" y="136" text-anchor="end" fill="${T.dim}" font-size="11" letter-spacing="2">CONTRIBUTIONS</text></g>${prisms}`);
}

export function drawHeatmap(theme, data) {
  const T = themeOf(theme);
  need(data, "calendar");
  const { calendar } = data;
  const { weeks } = calendar;
  const max = busiestDay(daysOf(calendar));
  const x0 = 60, y0 = 84, pitch = (FULL_WIDTH - PAD - x0) / weeks.length, gap = 3, s = pitch - gap;
  const H = Math.ceil(y0 + 7 * pitch - gap + PAD);
  let cells = "", months = "", last = "";
  weeks.forEach((w, wi) => {
    const m = new Date(w.contributionDays[0].date + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    if (m !== last && wi < weeks.length - 2) { months += `<text x="${(x0 + wi * pitch).toFixed(1)}" y="${y0 - 8}" fill="${T.dim}" font-size="11">${m}</text>`; last = m; }
    for (const d of w.contributionDays)
      cells += `<rect x="${(x0 + wi * pitch).toFixed(1)}" y="${(y0 + d.weekday * pitch).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${level(T, contributionLevel(d.contributionCount, max))}" class="f" style="animation-delay:${(wi * 0.012).toFixed(3)}s"><title>${d.date}: ${d.contributionCount}</title></rect>`;
  });
  const labels = ["Mon", "Wed", "Fri"].map((d, i) => `<text x="${PAD}" y="${(y0 + (1 + i * 2) * pitch + 11).toFixed(1)}" fill="${T.dim}" font-size="11">${d}</text>`).join("");
  const key = [0, 1, 2, 3, 4].map((l, i) => `<rect x="${FULL_WIDTH - PAD - (5 - i) * 12 + 4}" y="24" width="8" height="8" fill="${level(T, l)}"/>`).join("");
  return svgDocument(FULL_WIDTH, H, `${calendar.totalContributions} contributions in the last year`, `${card(T, FULL_WIDTH, H, "HEATMAP · DAY BY DAY")}${key}${months}${labels}${cells}`);
}

function streaks(days) {
  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount) current++;
    else if (i !== days.length - 1) break;
  }
  const active = days.filter((d) => d.contributionCount).length;
  return { current, longest, active };
}

// Streak and merged PRs: four numbers. Today without contributions does not break the current streak.
export function drawStreak(theme, data) {
  const T = themeOf(theme);
  need(data, "calendar", "merged");
  const { current, longest, active } = streaks(daysOf(data.calendar));
  const { merged } = data;
  const W = FULL_WIDTH, H = H3;
  const big = (x, n, l, c, d) => `<g class="u" style="animation-delay:${d}s"><text x="${x}" y="112" text-anchor="middle" fill="${c}" font-size="48">${fmt(n)}</text><text x="${x}" y="144" text-anchor="middle" fill="${T.dim}" font-size="11" letter-spacing="2">${l}</text></g>`;
  const cols = [W * 0.125, W * 0.375, W * 0.625, W * 0.875];
  return svgDocument(W, H, `Current streak ${current} days, longest ${longest}, ${active} active days in the last year, ${merged} merged pull requests in public repositories`,
    card(T, W, H, "STREAK · LAST 12 MONTHS")
    + big(cols[0], current, "CURRENT STREAK", T.red, 0) + big(cols[1], longest, "LONGEST", T.fg, 0.08)
    + big(cols[2], active, "ACTIVE DAYS", T.fg, 0.16) + big(cols[3], merged, "MERGED PRS · PUBLIC REPOS", T.fg, 0.24)
    + hair(T, W * 0.25, 72, W * 0.25, 152) + hair(T, W * 0.5, 72, W * 0.5, 152) + hair(T, W * 0.75, 72, W * 0.75, 152));
}

const CARD_LINE_WIDTH = 33;

// Two lines of description; a longer text closes the second with an ellipsis.
function cardLines(text) {
  const lines = wrap(text, CARD_LINE_WIDTH);
  if (lines.length > 2) lines[1] = lines[1].replace(/[\s—–-]*$/, "") + "…";
  return lines.slice(0, 2);
}

// The meta row at the foot of a third-width card: language dot and language, star count, last-push date.
function metaRow(T, r) {
  const star = `<path d="M0-7l2.1 4.3 4.7.7-3.4 3.3.8 4.7L0 3.8-4.2 6l.8-4.7L-6.8-2l4.7-.7z" fill="${T.fg}"/>`;
  return `<circle cx="29" cy="152" r="5" fill="${T.red}"/><text x="42" y="156" fill="${T.fg}" font-size="13">${esc(r.primaryLanguage?.name || "—")}</text>
<g transform="translate(160 152)">${star}</g><text x="174" y="156" fill="${T.fg}" font-size="13">${r.stargazerCount}</text>
<text x="${CARD3 - PAD}" y="156" text-anchor="end" fill="${T.dim}" font-size="12">${new Date(r.pushedAt).toISOString().slice(0, 10)}</text>`;
}

// A third-width card: the shared frame with its title, the name, up to two lines of body, and the foot row; `i` is its place in the row.
const third = (T, i, title, name, lines, foot, opts) => `<g transform="translate(${i * STEP3} 0)">${card(T, CARD3, H3, title, opts)}
<text x="${PAD}" y="80" fill="${T.fg}" font-size="20">${esc(name)}</text>
${lines.map((l, k) => `<text x="${PAD}" y="${104 + k * 19}" fill="${T.dim}" font-size="13">${esc(l)}</text>`).join("")}
${foot}</g>`;

// A featured repo's card: name, English description, language, stars and last push.
export function drawRepoCard(theme, data) {
  const T = themeOf(theme);
  need(data, "repo", "index");
  const { repo: r, index } = data;
  const text = data.description || r.description || "";
  return svgDocument(SLOT3, H3, `${r.name}: ${text} ${r.stargazerCount} stars, ${r.primaryLanguage?.name || ""}`,
    third(T, index, "REPOSITORY", r.name, cardLines(text), metaRow(T, r)));
}

// A dev-kit tool's card: both an npm package and an agent skill; the meta row only when its repo is known.
export function drawToolCard(theme, data) {
  const T = themeOf(theme);
  need(data, "name", "index");
  const { name, repo: r, index } = data;
  const text = data.description || "";
  return svgDocument(SLOT3, H3, `${name}, an npm package and a Claude Code skill: ${text}${r ? ` ${r.stargazerCount} stars, ${r.primaryLanguage?.name || ""}` : ""}`,
    third(T, index, "NPM PACKAGE · CLAUDE CODE SKILL", name, cardLines(text), r ? metaRow(T, r) : ""));
}

const WEEK = 7;
const WEEKLY_FROM_DAYS = 28;

function shiftDay(day, n) {
  const t = new Date(day + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

// The window of the daily counts: it ends at the last day npm reports; the sparkline is weekly from four weeks of data.
function downloadWindow(packages, today) {
  const byDay = {};
  for (const k of packages) for (const d of k.daily) byDay[d.day] = (byDay[d.day] || 0) + d.downloads;
  const end = Object.keys(byDay).filter((d) => byDay[d] > 0).sort().at(-1) || today;
  const first = packages.map((k) => k.since).sort()[0] || today;
  const dayList = Object.keys(byDay).filter((d) => d >= first && d <= end).sort();
  const weekly = dayList.length >= WEEKLY_FROM_DAYS;
  const buckets = [];
  if (weekly) for (let i = dayList.length; i > 0; i -= WEEK) buckets.unshift(dayList.slice(Math.max(0, i - WEEK), i).reduce((a, d) => a + byDay[d], 0));
  else buckets.push(...dayList.map((d) => byDay[d]));
  return { end, first, weekly, buckets };
}

const lastWeek = (k, end) => k.daily.filter((d) => d.day > shiftDay(end, -WEEK) && d.day <= end).reduce((a, d) => a + d.downloads, 0);

// Each package's counts as its own third-width card, so the README can link each one to its npm page.
export function drawNpmPackage(theme, data) {
  const T = themeOf(theme);
  need(data, "pkg", "today", "index");
  const { pkg: k, index } = data;
  const week = lastWeek(k, downloadWindow([k], data.today).end);
  return svgDocument(SLOT3, H3, `${k.p} v${k.version} on npm: ${fmt(k.total)} downloads since ${k.since}, ${fmt(week)} in the last 7 days`,
    `<g transform="translate(${index * STEP3} 0)">${card(T, CARD3, H3, "NPM DOWNLOADS", { right: `v${k.version}` })}<g class="u">
<text x="${PAD}" y="80" fill="${T.fg}" font-size="20">${esc(k.p)}</text>
<text x="${PAD}" y="104" fill="${T.dim}" font-size="13">since ${k.since}</text>
<text x="${PAD}" y="156" fill="${T.fg}" font-size="30">${fmt(k.total)}</text>
<text x="${CARD3 - PAD}" y="156" text-anchor="end" fill="${T.red}" font-size="13">+${fmt(week)} this week</text></g></g>`);
}

// Rolling counter: each digit a column of 0-9 that scrolls to its value.
function rollingCounter(T, total) {
  const size = 80, lh = 96, cw = size * 0.6, wy = 76, base = wy + size * 0.78;
  let x = PAD, counter = "", keys = "";
  fmt(total).split("").forEach((ch, i) => {
    if (!/\d/.test(ch)) { counter += `<text x="${x - cw * 0.22}" y="${base}" fill="${T.red}" font-size="${size}">${ch}</text>`; x += cw * 0.5; return; }
    const v = Number(ch);
    keys += `@keyframes roll${i}{from{transform:translateY(0)}to{transform:translateY(-${(v + 10) * lh}px)}}`;
    const col = Array.from({ length: 20 }, (_, n) => `<text x="${x}" y="${base + n * lh}" fill="${T.red}" font-size="${size}">${n % 10}</text>`).join("");
    counter += `<g style="animation:roll${i} ${1.6 + i * 0.25}s cubic-bezier(.16,1,.3,1) both">${col}</g>`;
    x += cw;
  });
  return { counter, keys, clip: `<clipPath id="win"><rect x="0" y="${wy}" width="${x + 20}" height="${lh}"/></clipPath>` };
}

// Sparkline of the weekly (or daily) totals.
function sparkline(T, { first, weekly, buckets }, W) {
  const sx0 = 560, sx1 = W - PAD, sy0 = 100, sy1 = 196;
  const bmax = Math.max(...buckets, 1);
  const pts = buckets.map((b, i) => [sx0 + (buckets.length < 2 ? 0 : (i / (buckets.length - 1)) * (sx1 - sx0)), sy1 - (b / bmax) * (sy1 - sy0)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)[0].toFixed(1)} ${sy1} L${pts[0][0].toFixed(1)} ${sy1} Z`;
  return `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.red}" stop-opacity=".28"/><stop offset="1" stop-color="${T.red}" stop-opacity="0"/></linearGradient></defs>
<text x="${sx0}" y="84" fill="${T.dim}" font-size="11" letter-spacing="1.5">${weekly ? "WEEKLY" : "DAILY"} DOWNLOADS SINCE ${first}</text>${hair(T, sx0 - 32, 72, sx0 - 32, 216)}
${hair(T, sx0, sy1, sx1, sy1)}<path d="${area}" fill="url(#a)" class="f" style="animation-delay:1s"/>
<path d="${line}" pathLength="1" fill="none" stroke="${T.red}" stroke-width="2.5" stroke-linejoin="round" class="d"/>
<circle cx="${pts.at(-1)[0].toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="5" fill="${T.red}" class="f" style="animation-delay:2s"/>
<text x="${sx1}" y="${sy1 + 20}" text-anchor="end" fill="${T.dim}" font-size="11" letter-spacing="1.5">${fmt(buckets.at(-1) || 0)} ${weekly ? "THIS WEEK" : "LAST DAY"} · PEAK ${fmt(bmax)}</text>`;
}

// npm: all-time downloads of the dev-kit tools since each was published, as a rolling counter, the last 7 days and the weekly total as a sparkline.
export function drawNpm(theme, data) {
  const T = themeOf(theme);
  need(data, "packages", "today");
  const { packages } = data;
  const span = downloadWindow(packages, data.today);
  const total = packages.reduce((a, k) => a + k.total, 0);
  const week = packages.reduce((a, k) => a + lastWeek(k, span.end), 0);
  const W = FULL_WIDTH, H = 240;
  const label = `npm downloads of the dev-kit tools since publication: ${fmt(total)} in total, ${fmt(week)} in the last 7 days. `
    + packages.map((k) => `${k.p} v${k.version}: ${fmt(k.total)}, ${fmt(lastWeek(k, span.end))} in the last 7 days`).join(". ");
  const { counter, keys, clip } = rollingCounter(T, total);
  return svgDocument(W, H, label, `<style>${keys}</style><defs>${clip}</defs>${card(T, W, H, "NPM · ALL-TIME DOWNLOADS · 3 PACKAGES")}
<g clip-path="url(#win)">${counter}</g>
<text x="${PAD}" y="200" fill="${T.fg}" font-size="13" class="u" style="animation-delay:1.2s"><tspan fill="${T.red}">+${fmt(week)}</tspan> in the last 7 days</text>
${sparkline(T, span, W)}`);
}

const HOUR_MS = 36e5;
const HOURS_PER_DAY = 24;
const BUILDING_LINE_WIDTH = 76;

function ago(iso, now) {
  const h = Math.round((now.getTime() - new Date(iso)) / HOUR_MS);
  if (h < 1) return "just now";
  return h < HOURS_PER_DAY ? `${h} h ago` : `${Math.round(h / HOURS_PER_DAY)} d ago`;
}

// Currently building: the most recently pushed public repo with an English description, and the latest pull-request
// activity in such a repo. Raw PR and commit titles are never printed. Null when no repo qualifies.
export function drawBuilding(theme, data) {
  const T = themeOf(theme);
  need(data, "repos", "events", "descriptions", "user", "now");
  const { descriptions, now } = data;
  const describe = (name) => descriptions[name]?.description;
  const latest = data.repos.find((r) => r.name !== data.user && describe(r.name));
  if (!latest) return null;
  const prEvent = data.events.find((e) => e.type === "PullRequestEvent" && describe(e.repo.name.split("/")[1]));
  const prRepo = prEvent?.repo.name.split("/")[1];
  const prVerb = prEvent ? `Pull request ${prEvent.payload.action}` : "";
  const desc = wrap(describe(latest.name), BUILDING_LINE_WIDTH).slice(0, 2).map((l, i) => `<text x="${PAD}" y="${120 + i * 19}" fill="${T.dim}" font-size="13">${esc(l)}</text>`).join("");
  return svgDocument(FULL_WIDTH, H3, `Currently building ${latest.name}: ${describe(latest.name)}${prEvent ? ` ${prVerb} in ${prRepo} on ${prEvent.created_at.slice(0, 10)}.` : ""}`,
    `${card(T, FULL_WIDTH, H3, "CURRENTLY BUILDING", { pulse: true })}
<g class="u"><text x="${PAD}" y="96" fill="${T.fg}" font-size="30">${esc(latest.name)}</text>${desc}
<text x="${PAD}" y="156" fill="${T.dim}" font-size="13">${esc(latest.primaryLanguage?.name || "")} · last push ${ago(latest.pushedAt, now)}</text></g>
${hair(T, 680, 72, 680, 152)}
${prEvent ? `<g class="u" style="animation-delay:.2s"><text x="704" y="84" fill="${T.dim}" font-size="11" letter-spacing="1.5">LATEST REVIEWABLE WORK</text>
<text x="704" y="112" fill="${T.fg}" font-size="20">${esc(prVerb)}</text>
<text x="704" y="136" fill="${T.dim}" font-size="13">${esc(prRepo)} · #${prEvent.payload.number ?? prEvent.payload.pull_request?.number}</text>
<text x="704" y="156" fill="${T.dim}" font-size="13">${prEvent.created_at.slice(0, 10)}</text></g>` : ""}`);
}
