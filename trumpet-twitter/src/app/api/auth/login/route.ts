import { apiHandler } from "@/lib/api-handler";
import { login, parseAuthBody, sessionCookieOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decodeJson, jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export const POST = apiHandler(async (request) => {
  const body = await decodeJson(request, parseAuthBody);
  const result = await login(getDb(), body);
  const response = jsonResponse(200, { user: result.user });
  response.cookies.set({
    ...sessionCookieOptions(result.expires),
    value: result.token,
  });
  return response;
});
