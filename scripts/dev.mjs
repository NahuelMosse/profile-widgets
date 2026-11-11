import { createServer } from "node:http";
import { GET } from "../api/profile/[name].mjs";

const DEFAULT_PORT = 3000;
const WIDGET_PATH = /^\/api\/profile\/[^/]+$/;

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

// Routes /api/profile/:name like Vercel does in production.
const server = createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch {
    return send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad request.\n");
  }
  if (!WIDGET_PATH.test(url.pathname)) return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found.\n");
  if (req.method !== "GET") return send(res, 405, { "Content-Type": "text/plain; charset=utf-8", Allow: "GET" }, "Method not allowed.\n");
  const response = await GET(new Request(url));
  send(res, response.status, Object.fromEntries(response.headers), Buffer.from(await response.arrayBuffer()));
});

server.listen(Number(process.env.PORT ?? DEFAULT_PORT), () => {
  console.log(`widgets listening on http://localhost:${server.address().port}`);
});
