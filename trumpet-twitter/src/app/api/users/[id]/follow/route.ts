import { apiHandler } from "@/lib/api-handler";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/http";
import { setFollow } from "@/lib/users";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler(async (request, context) => {
  const viewer = requireViewer(request);
  const { id } = await (context as Ctx).params;
  const user = setFollow(getDb(), viewer, id, true);
  return jsonResponse(200, { user });
});

export const DELETE = apiHandler(async (request, context) => {
  const viewer = requireViewer(request);
  const { id } = await (context as Ctx).params;
  const user = setFollow(getDb(), viewer, id, false);
  return jsonResponse(200, { user });
});
