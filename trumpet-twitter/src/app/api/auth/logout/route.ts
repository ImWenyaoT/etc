import { apiHandler } from "@/lib/api-handler";
import { clearSessionCookieOptions, logout, readSessionId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export const POST = apiHandler(async (request) => {
  logout(getDb(), readSessionId(request));
  const response = jsonResponse(204, null);
  response.cookies.set(clearSessionCookieOptions());
  return response;
});
