import { jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse(200, { ok: true });
}
