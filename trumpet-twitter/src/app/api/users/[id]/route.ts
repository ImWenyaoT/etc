import { apiHandler } from "@/lib/api-handler";
import { viewerId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/http";
import { getProfile } from "@/lib/users";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/users/[handle] — param is the user handle. */
export const GET = apiHandler(async (request, context) => {
  const viewer = viewerId(request);
  const { id: handle } = await (context as Ctx).params;
  const user = getProfile(getDb(), handle, viewer);
  return jsonResponse(200, { user });
});
