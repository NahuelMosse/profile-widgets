import { FONT_BASE64 } from "./font.mjs";

const RED = "#d2231b";

// Each theme names the GitHub page it sits on (bg), so solid fills can be mixed toward it and read as if transparent.
export const THEMES = {
  dark: { bg: "#0d1117", fg: "#ede4d0", dim: "#9a9283", line: "#ede4d0", lineOp: 0.16, red: RED, shade: 0.3 },
  light: { bg: "#ffffff", fg: "#0c0c0b", dim: "#6b655a", line: "#0c0c0b", lineOp: 0.16, red: "#c41f17", shade: 0.18 },
};

export const THEME_NAMES = Object.keys(THEMES);

export function themeOf(name) {
  if (!Object.hasOwn(THEMES, name)) throw new TypeError(`unknown theme ${name}`);
  return THEMES[name];
}

const hex = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

export const mix = (a, b, t) => "#" + hex(a).map((x, i) => Math.round(x + (hex(b)[i] - x) * t).toString(16).padStart(2, "0")).join("");

const LEVEL_STRENGTH = [0, 0.38, 0.6, 0.8, 1];

// Contribution levels 0..4: a faint fg tint for an empty day, then the red mixed into the page at rising strength.
export const level = (T, l) => (l === 0 ? mix(T.bg, T.fg, 0.09) : mix(T.bg, T.red, LEVEL_STRENGTH[l]));

export const STYLE = `@font-face{font-family:CP;src:url(data:font/woff2;base64,${FONT_BASE64}) format("woff2")}text{font-family:CP,"Courier New",monospace}
@keyframes in{from{opacity:0}to{opacity:1}}.f{animation:in .6s ease-out both}
@keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.u{animation:up .7s cubic-bezier(.16,1,.3,1) both}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}.g{transform-box:fill-box;transform-origin:left;animation:grow .9s cubic-bezier(.16,1,.3,1) both}
@keyframes rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}.r{transform-box:fill-box;transform-origin:bottom;animation:rise .9s cubic-bezier(.16,1,.3,1) both}
@keyframes draw{to{stroke-dashoffset:0}}.d{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 2s cubic-bezier(.65,0,.35,1) both}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.d{stroke-dashoffset:0}}`;
