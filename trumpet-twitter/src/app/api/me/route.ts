import { apiHandler } from "@/lib/api-handler";
import { me } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  const user = me(getDb(), request);
  return jsonResponse(200, { user });
});
