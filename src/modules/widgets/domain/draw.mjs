import { level, mix, SHADOW, STYLE, themeOf } from "./themes.mjs";

const STATIC_WIDGETS = ["streak", "heatmap", "skyline", "building", "npm", "views"];
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

// Every widget is drawn at the width the README shows it at in its 1012 px column: full width, a third (337) or a quarter.
// Rows of three are laid with no gap between their images, and each image insets its content by its place in the row, so
// the outer edges of a row meet the full-width widgets at PAD and COL - PAD.
const COL = 1012, PAD = 24, GUT = 24, BAND = 176;
const THIRDS = 3;

// Image width, content width and content offset of the k-th of n images in a row: three, or four for the links row.
function slot(k, n = THIRDS) {
  const W = Math.round(COL * (n === THIRDS ? 0.333 : 0.249));
  const cw = (COL - 2 * PAD - (n - 1) * GUT) / n;
  return { W, cw, x: +(PAD + k * (cw + GUT) - ((COL - n * W) / 2 + k * W)).toFixed(1) };
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
const title = (T, text, x = PAD, y = 34, pulse = false) => `<rect x="${x}" y="${y - 8}" width="8" height="8" fill="${T.red}">${pulse ? '<animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/>' : ""}</rect><text x="${x + 16}" y="${y}" fill="${T.fg}" font-size="11" letter-spacing="2">${esc(text)}</text>`;

function svgDocument(w, h, label, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title><style>${STYLE}</style>
${inner}</svg>
`;
}

// A widget of a row: `inner` is drawn from x = 0 to the content width, set at the slot's offset.
function slotDocument(index, h, label, inner, n = THIRDS) {
  const s = slot(index, n);
  return svgDocument(s.W, h, label, `<g transform="translate(${s.x} 0)">${inner(s.cw)}</g>`);
}

const daysOf = (calendar) => calendar.weeks.flatMap((w) => w.contributionDays);

// Contribution count to level 1..4 on a log scale of the busiest day; 0 stays 0.
const contributionLevel = (n, max) => (n === 0 ? 0 : Math.min(4, 1 + Math.floor((Math.log(n) / Math.log(max + 1)) * 4)));
const busiestDay = (days) => Math.max(...days.map((d) => d.contributionCount), 1);

// 3D skyline: each day a prism on an oblique grid, its height by contributions, rising week by week. The grid spans the
// inner width and the height follows from the data, so the figure fills its widget.
export function drawSkyline(theme, data) {
  const T = themeOf(theme);
  need(data, "calendar");
  const { calendar } = data;
  const W = COL, MAXBAR = 104;
  const e2 = [-9.2, 6.5]; // one weekday
  const e1 = [(W - 2 * PAD - 7 * Math.abs(e2[0])) / calendar.weeks.length, 3.2]; // one week
  const max = busiestDay(daysOf(calendar));
  const cells = [];
  calendar.weeks.forEach((w, wi) => w.contributionDays.forEach((d) => cells.push({ wi, di: d.weekday, n: d.contributionCount, date: d.date, h: d.contributionCount ? 5 + MAXBAR * Math.sqrt(d.contributionCount / max) : 1.5 })));
  const ox = PAD + 7 * Math.abs(e2[0]), rel = (c) => c.wi * e1[1] + c.di * e2[1];
  const oy = 56 + Math.max(...cells.map((c) => c.h - rel(c)));
  const H = Math.ceil(Math.max(...cells.map((c) => oy + rel(c) + e1[1] + e2[1]))) + PAD;
  cells.sort((a, b) => rel(a) - rel(b) || a.wi - b.wi);
  const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const total = fmt(calendar.totalContributions);
  const prisms = cells.map(({ wi, di, n, date, h }) => {
    const x = ox + wi * e1[0] + di * e2[0], y = oy + wi * e1[1] + di * e2[1];
    const a = [x, y], b = [x + e1[0], y + e1[1]], c = [x + e1[0] + e2[0], y + e1[1] + e2[1]], dd = [x + e2[0], y + e2[1]];
    const top = level(T, contributionLevel(n, max)), side = mix(top, SHADOW, T.shade), front = mix(top, SHADOW, T.shade * 0.55);
    const up = (p) => [p[0], p[1] - h];
    return `<g class="r" style="animation-delay:${(wi * 0.018).toFixed(3)}s"><title>${date}: ${n}</title>`
      + `<polygon points="${P(...dd)} ${P(...c)} ${P(...up(c))} ${P(...up(dd))}" fill="${front}"/>`
      + `<polygon points="${P(...b)} ${P(...c)} ${P(...up(c))} ${P(...up(b))}" fill="${side}"/>`
      + `<polygon points="${P(...up(a))} ${P(...up(b))} ${P(...up(c))} ${P(...up(dd))}" fill="${top}"/></g>`;
  }).join("");
  return svgDocument(W, H, `${total} contributions in the last year, as a 3D skyline`, `${title(T, "CONTRIBUTIONS · LAST 12 MONTHS")}
${prisms}<g class="u"><text x="${PAD}" y="${H - PAD - 24}" fill="${T.red}" font-size="48">${total}</text>
<text x="${PAD}" y="${H - PAD}" fill="${T.dim}" font-size="11" letter-spacing="2">CONTRIBUTIONS</text></g>`);
}

// Contribution heatmap: day labels at the inset, the grid filling the rest of the width.
export function drawHeatmap(theme, data) {
  const T = themeOf(theme);
  need(data, "calendar");
  const { calendar } = data;
  const { weeks } = calendar;
  const max = busiestDay(daysOf(calendar));
  const gap = 3, x0 = PAD + 30, y0 = 70;
  const pitch = (COL - PAD - x0 + gap) / weeks.length, s = pitch - gap;
  const H = Math.ceil(y0 + 7 * pitch + 12 + 14 + PAD);
  let cells = "", months = "", last = "";
  weeks.forEach((w, wi) => {
    const m = new Date(w.contributionDays[0].date + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    if (m !== last && wi < weeks.length - 2) { months += `<text x="${(x0 + wi * pitch).toFixed(1)}" y="${y0 - 8}" fill="${T.dim}" font-size="11">${m}</text>`; last = m; }
    for (const d of w.contributionDays)
      cells += `<rect x="${(x0 + wi * pitch).toFixed(1)}" y="${(y0 + d.weekday * pitch).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${level(T, contributionLevel(d.contributionCount, max))}" class="f" style="animation-delay:${(wi * 0.012).toFixed(3)}s"><title>${d.date}: ${d.contributionCount}</title></rect>`;
  });
  const labels = ["Mon", "Wed", "Fri"].map((d, i) => `<text x="${PAD}" y="${(y0 + (1 + i * 2) * pitch + s - 3).toFixed(1)}" fill="${T.dim}" font-size="11">${d}</text>`).join("");
  const key = [0, 1, 2, 3, 4].map((l, i) => `<rect x="${COL - PAD - (5 - i) * 18 + 4}" y="${(y0 + 7 * pitch + 12).toFixed(1)}" width="14" height="14" fill="${level(T, l)}"/>`).join("");
  return svgDocument(COL, H, `${calendar.totalContributions} contributions in the last year`,
    `${title(T, "HEATMAP · DAY BY DAY")}${months}${labels}${cells}${key}`);
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
  const W = COL, H = BAND, x0 = PAD, x1 = W - PAD, cw = (x1 - x0) / 4;
  const big = (i, n, l, c, d) => `<g class="u" style="animation-delay:${d}s"><text x="${x0 + cw * (i + 0.5)}" y="112" text-anchor="middle" fill="${c}" font-size="48">${fmt(n)}</text><text x="${x0 + cw * (i + 0.5)}" y="140" text-anchor="middle" fill="${T.dim}" font-size="11" letter-spacing="2">${l}</text></g>`;
  return svgDocument(W, H, `Current streak ${current} days, longest ${longest}, ${active} active days in the last year, ${merged} merged pull requests in public repositories`,
    title(T, "STREAK · LAST 12 MONTHS")
    + big(0, current, "CURRENT STREAK", T.red, 0) + big(1, longest, "LONGEST", T.fg, 0.08)
    + big(2, active, "ACTIVE DAYS", T.fg, 0.16) + big(3, merged, "MERGED PRS · PUBLIC REPOS", T.fg, 0.24)
    + [1, 2, 3].map((i) => hair(T, x0 + cw * i, 72, x0 + cw * i, 146)).join("")
    + hair(T, x0, H - 8.5, x1, H - 8.5));
}

const CARD_LINE_WIDTH = 35;

// Two lines of description; a longer text closes the second with an ellipsis.
function cardLines(text) {
  const lines = wrap(text, CARD_LINE_WIDTH);
  if (lines.length > 2) lines[1] = lines[1].replace(/[\s—–-]*$/, "") + "…";
  return lines.slice(0, 2);
}

// The meta row at the foot of a card: language dot and language, star count, last-push date, closing hairline.
function metaRow(T, r, cw) {
  const star = `<path d="M0-7l2.1 4.3 4.7.7-3.4 3.3.8 4.7L0 3.8-4.2 6l.8-4.7L-6.8-2l4.7-.7z" fill="${T.fg}"/>`;
  return `<circle cx="6" cy="146" r="6" fill="${T.red}"/><text x="20" y="151" fill="${T.fg}" font-size="14">${esc(r.primaryLanguage?.name || "—")}</text>
<g transform="translate(${cw * 0.5} 146)">${star}</g><text x="${cw * 0.5 + 14}" y="151" fill="${T.fg}" font-size="14">${r.stargazerCount}</text>
<text x="${cw}" y="151" text-anchor="end" fill="${T.dim}" font-size="11">${new Date(r.pushedAt).toISOString().slice(0, 10)}</text>
${hair(T, 0, BAND - 5.5, cw, BAND - 5.5)}`;
}

// A card of a third-width row: tab and label, name, two lines of text, meta row.
function card(T, cw, label, name, text, r) {
  return `<rect x="0" y="4" width="48" height="3" fill="${T.red}" class="g"/>
<text x="0" y="34" fill="${T.dim}" font-size="11" letter-spacing="2">${label}</text>
<text x="0" y="64" fill="${T.fg}" font-size="20">${esc(name)}</text>
${cardLines(text).map((l, i) => `<text x="0" y="${92 + i * 20}" fill="${T.dim}" font-size="14">${esc(l)}</text>`).join("")}
${r ? metaRow(T, r, cw) : hair(T, 0, BAND - 5.5, cw, BAND - 5.5)}`;
}

// A featured repo's card: name, English description, language, stars and last push.
export function drawRepoCard(theme, data) {
  const T = themeOf(theme);
  need(data, "repo", "index");
  const { repo: r, index } = data;
  const text = data.description || r.description || "";
  return slotDocument(index, BAND, `${r.name}: ${text} ${r.stargazerCount} stars, ${r.primaryLanguage?.name || ""}`,
    (cw) => card(T, cw, "REPOSITORY", r.name, text, r));
}

// A tool's card: name, description and, when its repo is known, the meta row.
export function drawToolCard(theme, data) {
  const T = themeOf(theme);
  need(data, "name", "index");
  const { name, repo: r, index } = data;
  const text = data.description || "";
  return slotDocument(index, BAND, `${name}, an npm package and a Claude Code skill: ${text}${r ? ` ${r.stargazerCount} stars, ${r.primaryLanguage?.name || ""}` : ""}`,
    (cw) => card(T, cw, "NPM PACKAGE · CLAUDE CODE SKILL", name, text, r));
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

// Each package's counts as its own image of a row, so the README can link each one to its npm page.
export function drawNpmPackage(theme, data) {
  const T = themeOf(theme);
  need(data, "pkg", "today", "index");
  const { pkg: k, index } = data;
  const week = lastWeek(k, downloadWindow([k], data.today).end);
  return slotDocument(index, 104, `${k.p} v${k.version} on npm: ${fmt(k.total)} downloads since ${k.since}, ${fmt(week)} in the last 7 days`,
    (cw) => `<g class="u"><text x="0" y="28" fill="${T.fg}" font-size="20">${esc(k.p)}</text>
<text x="0" y="50" fill="${T.dim}" font-size="11">v${esc(k.version)} · since ${k.since}</text>
<text x="0" y="88" fill="${T.fg}" font-size="30">${fmt(k.total)}</text>
<text x="${String(fmt(k.total)).length * 18 + 14}" y="88" fill="${T.red}" font-size="14">+${fmt(week)} this week</text></g>
${hair(T, 0, 98.5, cw, 98.5)}`);
}

// Rolling counter: each digit a column of 0-9 that scrolls to its value.
function rollingCounter(T, total) {
  const size = 80, lh = 88, cw = size * 0.6, top = 64;
  let x = PAD, counter = "", keys = "";
  fmt(total).split("").forEach((ch, i) => {
    if (!/\d/.test(ch)) { counter += `<text x="${x - cw * 0.22}" y="${top + size * 0.78}" fill="${T.red}" font-size="${size}">${ch}</text>`; x += cw * 0.5; return; }
    const v = Number(ch);
    keys += `@keyframes roll${i}{from{transform:translateY(0)}to{transform:translateY(-${(v + 10) * lh}px)}}`;
    const col = Array.from({ length: 20 }, (_, n) => `<text x="${x}" y="${top + size * 0.78 + n * lh}" fill="${T.red}" font-size="${size}">${n % 10}</text>`).join("");
    counter += `<g style="animation:roll${i} ${1.6 + i * 0.25}s cubic-bezier(.16,1,.3,1) both">${col}</g>`;
    x += cw;
  });
  return { counter, keys, clip: `<clipPath id="win"><rect x="0" y="${top}" width="${x + 20}" height="${lh}"/></clipPath>` };
}

// Sparkline of the weekly (or daily) totals.
function sparkline(T, { first, weekly, buckets }, W) {
  const sx0 = COL / 2 + PAD, sx1 = W - PAD, sy0 = 88, sy1 = 168;
  const bmax = Math.max(...buckets, 1);
  const pts = buckets.map((b, i) => [sx0 + (buckets.length < 2 ? 0 : (i / (buckets.length - 1)) * (sx1 - sx0)), sy1 - (b / bmax) * (sy1 - sy0)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)[0].toFixed(1)} ${sy1} L${pts[0][0].toFixed(1)} ${sy1} Z`;
  return `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.red}" stop-opacity=".28"/><stop offset="1" stop-color="${T.red}" stop-opacity="0"/></linearGradient></defs>
<text x="${sx0}" y="74" fill="${T.dim}" font-size="11" letter-spacing="2">${weekly ? "WEEKLY" : "DAILY"} DOWNLOADS SINCE ${first}</text>
${hair(T, sx0, sy1, sx1, sy1)}<path d="${area}" fill="url(#a)" class="f" style="animation-delay:1s"/>
<path d="${line}" pathLength="1" fill="none" stroke="${T.red}" stroke-width="2.5" stroke-linejoin="round" class="d"/>
<circle cx="${pts.at(-1)[0].toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="5" fill="${T.red}" class="f" style="animation-delay:2s"/>
<text x="${sx1}" y="${sy1 + 22}" text-anchor="end" fill="${T.dim}" font-size="11" letter-spacing="1">${fmt(buckets.at(-1) || 0)} ${weekly ? "THIS WEEK" : "LAST DAY"} · PEAK ${fmt(bmax)}</text>`;
}

// npm: all-time downloads of the dev-kit tools since each was published, as a rolling counter, the last 7 days and the weekly total as a sparkline.
export function drawNpm(theme, data) {
  const T = themeOf(theme);
  need(data, "packages", "today");
  const { packages } = data;
  const span = downloadWindow(packages, data.today);
  const total = packages.reduce((a, k) => a + k.total, 0);
  const week = packages.reduce((a, k) => a + lastWeek(k, span.end), 0);
  const W = COL, H = 212;
  const label = `npm downloads of the dev-kit tools since publication: ${fmt(total)} in total, ${fmt(week)} in the last 7 days. `
    + packages.map((k) => `${k.p} v${k.version}: ${fmt(k.total)}, ${fmt(lastWeek(k, span.end))} in the last 7 days`).join(". ");
  const { counter, keys, clip } = rollingCounter(T, total);
  return svgDocument(W, H, label, `<style>${keys}</style><defs>${clip}</defs>${title(T, "NPM · ALL-TIME DOWNLOADS · 3 PACKAGES")}
<g clip-path="url(#win)">${counter}</g>
<text x="${PAD}" y="190" fill="${T.fg}" font-size="14" class="u" style="animation-delay:1.2s"><tspan fill="${T.red}">+${fmt(week)}</tspan> in the last 7 days</text>
${sparkline(T, span, W)}`);
}

const HOUR_MS = 36e5;
const HOURS_PER_DAY = 24;

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
  const split = 660, px = split + PAD;
  const desc = wrap(describe(latest.name), 70).slice(0, 2).map((l, i) => `<text x="${PAD}" y="${114 + i * 20}" fill="${T.dim}" font-size="14">${esc(l)}</text>`).join("");
  return svgDocument(COL, BAND, `Currently building ${latest.name}: ${describe(latest.name)}${prEvent ? ` ${prVerb} in ${prRepo} on ${prEvent.created_at.slice(0, 10)}.` : ""}`,
    `${hair(T, PAD, 0.5, COL - PAD, 0.5)}${hair(T, PAD, BAND - 0.5, COL - PAD, BAND - 0.5)}
${title(T, "CURRENTLY BUILDING", PAD, 34, true)}
<g class="u"><text x="${PAD}" y="86" fill="${T.fg}" font-size="30">${esc(latest.name)}</text>${desc}
<text x="${PAD}" y="160" fill="${T.dim}" font-size="11" letter-spacing="1">${esc(latest.primaryLanguage?.name || "")} · last push ${ago(latest.pushedAt, now)}</text></g>
${hair(T, split, 28, split, 150)}
${prEvent ? `<g class="u" style="animation-delay:.2s"><text x="${px}" y="34" fill="${T.dim}" font-size="11" letter-spacing="2">LATEST REVIEWABLE WORK</text>
<text x="${px}" y="86" fill="${T.fg}" font-size="20">${esc(prVerb)}</text>
<text x="${px}" y="114" fill="${T.dim}" font-size="14">${esc(prRepo)} · #${prEvent.payload.number ?? prEvent.payload.pull_request?.number}</text>
<text x="${px}" y="160" fill="${T.dim}" font-size="11">${prEvent.created_at.slice(0, 10)}</text></g>` : ""}`);
}

// Profile views: the fourth chip of the links row, under the portfolio, LinkedIn and email links.
export function drawViews(theme, data) {
  need(data, "count");
  const T = themeOf(theme);
  return slotDocument(3, 48, `Profile views: ${fmt(data.count)}`, (cw) =>
    `<text x="0" y="16" fill="${T.red}" font-size="11" letter-spacing="2">PROFILE VIEWS</text>`
    + `<text x="0" y="38" fill="${T.fg}" font-size="14">${fmt(data.count)}</text>`
    + `<rect x="0" y="45" width="${cw}" height="2" fill="${T.red}" opacity=".5"/>`, 4);
}
