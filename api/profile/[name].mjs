import * as github from "../../src/modules/widgets/data/github.mjs";
import * as npm from "../../src/modules/widgets/data/npm.mjs";
import { methodNotAllowed, respond } from "../../src/modules/widgets/presentation/respond.mjs";

const fetchers = { ...github, ...npm };
const NOT_FOUND_CACHE = "public, max-age=300";

const toResponse = ({ status, headers, body }) => new Response(body, { status, headers });

// /api/profile/<name>.svg?theme=dark|light
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  const answer = await respond(widgetName(pathname), searchParams.get("theme") ?? undefined, fetchers);
  if (answer.status === 404) answer.headers = { ...answer.headers, "Cache-Control": NOT_FOUND_CACHE };
  return toResponse(answer);
}

export const HEAD = GET;

export const POST = () => toResponse(methodNotAllowed());
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
export const OPTIONS = POST;

function widgetName(pathname) {
  try {
    return decodeURIComponent(pathname.split("/").at(-1)).replace(/\.svg$/, "");
  } catch {
    return undefined;
  }
}
