import { NextResponse } from "next/server";
import { ValidationError, getStore } from "@/lib/scores";

export const runtime = "nodejs";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET() {
  try {
    const store = await getStore();
    return NextResponse.json({ items: store.list() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(500, message);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "提交内容有误，请刷新后重试。");
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { name?: unknown }).name !== "string" ||
    typeof (body as { score?: unknown }).score !== "number" ||
    !Number.isFinite((body as { score: number }).score)
  ) {
    return errorResponse(400, "提交内容有误，请刷新后重试。");
  }

  const name = (body as { name: string }).name;
  const score = (body as { score: number }).score;

  try {
    const store = await getStore();
    const saved = await store.add({ name, score });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(400, error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(400, message);
  }
}
