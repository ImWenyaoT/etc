import { NextResponse } from "next/server";
import {
  InvalidDocumentError,
  UnsupportedFormatError,
  parse,
} from "@/lib/parser";

export const runtime = "nodejs";

type Body = {
  source?: unknown;
  format?: unknown;
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
    typeof body.source !== "string" ||
    typeof body.format !== "string"
  ) {
    return errorResponse(400, "提交内容有误，请刷新后重试。");
  }

  try {
    const result = parse(body.source, "", body.format);
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof UnsupportedFormatError ||
      error instanceof InvalidDocumentError
    ) {
      return errorResponse(400, error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(400, message);
  }
}
