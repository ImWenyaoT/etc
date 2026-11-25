import { apiHandler } from "@/lib/api-handler";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decodeJson, jsonResponse } from "@/lib/http";
import { createPost, parseCreatePostBody } from "@/lib/posts";

export const runtime = "nodejs";

export const POST = apiHandler(async (request) => {
  const viewer = requireViewer(request);
  const body = await decodeJson(request, parseCreatePostBody);
  const post = createPost(getDb(), viewer, body);
  return jsonResponse(201, { post });
});
