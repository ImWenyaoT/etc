import { NextResponse } from "next/server";

export class RequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.code = code;
  }
}

export function problem(
  status: number,
  code: string,
  message: string,
): RequestError {
  return new RequestError(status, code, message);
}

export function jsonResponse(status: number, body: unknown): NextResponse {
  if (status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof RequestError) {
    return jsonResponse(err.status, {
      error: { code: err.code, message: err.message },
    });
  }
  console.error(err);
  return jsonResponse(500, {
    error: {
      code: "internal_error",
      message: "暂时无法使用，请稍后再试。",
    },
  });
}

export async function decodeJson<T>(
  request: Request,
  parse: (value: unknown) => T,
): Promise<T> {
  const text = await request.text();
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  try {
    return parse(value);
  } catch (err) {
    if (err instanceof RequestError) throw err;
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
}

/** Format like Go: 2006-01-02T15:04:05.000Z */
export function formatUtc(date = new Date()): string {
  return date.toISOString();
}
