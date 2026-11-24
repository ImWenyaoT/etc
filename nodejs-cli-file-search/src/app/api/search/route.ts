import { NextResponse } from "next/server";
import path from "node:path";
import { files, IncompleteSearchError } from "@/lib/search";

export const runtime = "nodejs";

type Body = {
  query?: unknown;
  max?: unknown;
};

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return errorResponse(400, "提交内容有误，请刷新后重试。");
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof body.query !== "string" ||
    typeof body.max !== "number" ||
    !Number.isFinite(body.max)
  ) {
    return errorResponse(400, "提交内容有误，请刷新后重试。");
  }

  const max = body.max;
  if (max < 1 || max > 1000) {
    return errorResponse(400, "max must be between 1 and 1000");
  }

  const searchRoot = process.env.SEARCH_ROOT?.trim() || ".";
  const root = path.resolve(/* turbopackIgnore: true */ searchRoot);

  try {
    const absolute = await files(
      { root, query: body.query, max },
      request.signal,
    );
    const items = absolute.map((item) => path.relative(root, item) || item);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof IncompleteSearchError) {
      return errorResponse(400, error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(400, message);
  }
}
