import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { GET } from "../api/profile/[name].mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const FRAMEWORK_CONFIGS = /^(next|nuxt|vite|astro|svelte|remix|gatsby|angular|webpack|rollup)\.config\./;
const MIN_ACTION_MAJOR = 5;

// The major of an action the workflow uses, or null when it is absent.
const actionMajor = (workflow, action) => {
  const found = workflow.match(new RegExp(`uses: ${action}@v(\\d+)`));
  return found ? Number(found[1]) : null;
};

// A request with its own connection, closed when the answer ends.
const call = (base, path, method = "GET") => new Promise((resolve, reject) => {
  const req = request(new URL(path, base), { method, agent: false }, (res) => {
    let text = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { text += chunk; });
    res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
  });
  req.on("error", reject);
  req.end();
});

// Starts scripts/dev.mjs on a free port and resolves with its base URL.
function startDevServer() {
  const child = spawn(process.execPath, ["--import", new URL("test/support/offline.mjs", root).href, "scripts/dev.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: "0", GITHUB_TOKEN: "" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  const url = new Promise((resolve, reject) => {
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const found = output.match(/http:\/\/[^\s]+:\d+/);
      if (found) resolve(found[0]);
    });
    child.on("exit", (code) => reject(new Error(`dev server exited with ${code}`)));
  });
  return { child, url };
}

test("the repo deploys on Vercel with no build and no framework @PW-7-ASM-04 @PW-6-S1 @PW-6-ASM-01 @PW-1-S3 @PW-1-ASM-05", async () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.type, "module");
  assert.equal(pkg.private, true);
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ["dev", "test"]);
  assert.equal(pkg.scripts.test, "node --test --test-force-exit test/*.test.mjs");
  assert.equal(pkg.scripts.dev, "node scripts/dev.mjs");
  assert.equal(pkg.engines.node, ">=22");
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);

  assert.deepEqual(readdirSync(root).filter((file) => FRAMEWORK_CONFIGS.test(file)), []);
  assert.equal(existsSync(new URL("api/profile/[name].mjs", root)), true);
  assert.equal(typeof GET, "function");
  if (existsSync(new URL("vercel.json", root))) {
    const config = JSON.parse(read("vercel.json"));
    for (const key of ["buildCommand", "installCommand", "outputDirectory", "framework"]) assert.equal(config[key], undefined, key);
  }

  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /node-version: 24/);
  assert.match(ci, /run: node --test --test-force-exit test\/\*\.test\.mjs/);
  for (const action of ["actions/checkout", "actions/setup-node"]) {
    const major = actionMajor(ci, action);
    assert.notEqual(major, null, `${action} is used`);
    assert.ok(major >= MIN_ACTION_MAJOR, `${action} is at v${MIN_ACTION_MAJOR} or newer`);
  }

  const readme = read("README.md");
  for (const text of ["https://lab.nawi.dev/api/profile/streak.svg?theme=dark", "<picture>", "prefers-color-scheme: dark", "GITHUB_TOKEN", "Framework Preset", "Other", "views"])
    assert.equal(readme.includes(text), true, text);

  // The local server routes /api/profile/:name like Vercel does.
  const { child, url } = startDevServer();
  try {
    const base = await url;
    const widget = await call(base, "/api/profile/streak.svg?theme=dark");
    assert.equal(widget.status, 503);
    assert.equal(widget.headers["retry-after"], "300");
    const unknown = await call(base, "/api/profile/nope.svg");
    assert.equal(unknown.status, 404);
    assert.match(unknown.text, /^Unknown widget or theme./);
    assert.equal((await call(base, "/other")).status, 404);
    const post = await call(base, "/api/profile/streak.svg", "POST");
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, "GET");
  } finally {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await exited;
    child.stdout.destroy();
  }
});
