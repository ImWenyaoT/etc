import { assertMutationOrigin } from "./config";
import { errorResponse } from "./http";

type Handler = (request: Request, context?: unknown) => Promise<Response>;

/** Wrap a route handler: origin check on mutations + sanitized errors. */
export function apiHandler(handler: Handler): Handler {
  return async (request, context) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        assertMutationOrigin(request);
      }
      return await handler(request, context);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
