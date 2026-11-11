import * as github from "../../src/modules/widgets/data/github.mjs";
import * as npm from "../../src/modules/widgets/data/npm.mjs";
import { respond } from "../../src/modules/widgets/presentation/respond.mjs";

const fetchers = { ...github, ...npm };

// /api/profile/<name>.svg?theme=dark|light
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  const { status, headers, body } = await respond(widgetName(pathname), searchParams.get("theme") ?? undefined, fetchers);
  return new Response(body, { status, headers });
}

function widgetName(pathname) {
  try {
    return decodeURIComponent(pathname.split("/").at(-1)).replace(/\.svg$/, "");
  } catch {
    return undefined;
  }
}
