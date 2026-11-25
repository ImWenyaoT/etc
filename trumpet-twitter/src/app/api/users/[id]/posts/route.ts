import { apiHandler } from "@/lib/api-handler";
import { viewerId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/http";
import { getUserPosts } from "@/lib/users";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/users/[handle]/posts */
export const GET = apiHandler(async (request, context) => {
  const viewer = viewerId(request);
  const { id: handle } = await (context as Ctx).params;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? "";
  const result = getUserPosts(getDb(), handle, viewer, cursor);
  return jsonResponse(200, result);
});
