// Loaded with `--import` into a child process: every request fails as if the network were down.
globalThis.fetch = async () => {
  throw new TypeError("fetch failed: offline");
};
