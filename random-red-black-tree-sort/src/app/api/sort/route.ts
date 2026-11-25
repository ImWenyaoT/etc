import { NextResponse } from "next/server";
import { demo } from "@/lib/rbtree";

export const runtime = "nodejs";

type Body = {
  count?: unknown;
  seed?: unknown;
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
    typeof body.count !== "number" ||
    !Number.isFinite(body.count) ||
    typeof body.seed !== "number" ||
    !Number.isFinite(body.seed)
  ) {
    return errorResponse(400, "提交内容有误，请刷新后重试。");
  }

  const count = Math.trunc(body.count);
  const seed = Math.trunc(body.seed);

  if (count < 1 || count > 1_000_000) {
    return errorResponse(400, "count must be between 1 and 1000000");
  }

  try {
    const result = demo(count, seed);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(400, message);
  }
}
