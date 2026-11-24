import { apiHandler } from "@/lib/api-handler";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/http";
import { timeline } from "@/lib/posts";

export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  const viewer = requireViewer(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? "";
  const page = timeline(getDb(), viewer, cursor);
  return jsonResponse(200, page);
});
