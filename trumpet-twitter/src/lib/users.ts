import type { DatabaseSync } from "node:sqlite";
import { getPage, getUser } from "./db";
import { formatUtc, problem } from "./http";
import type { User } from "./types";

export function setFollow(
  database: DatabaseSync,
  viewerId: string,
  targetId: string,
  follow: boolean,
): User {
  if (targetId === viewerId) {
    throw problem(400, "self_follow_not_allowed", "不能关注自己的账号。");
  }
  const target = getUser(database, "id", targetId, viewerId);
  if (!target) {
    throw problem(404, "user_not_found", "用户不存在");
  }
  if (follow) {
    database
      .prepare(
        "INSERT OR IGNORE INTO follows(follower_id, following_id, created_at) VALUES(?, ?, ?)",
      )
      .run(viewerId, targetId, formatUtc());
  } else {
    database
      .prepare(
        "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
      )
      .run(viewerId, targetId);
  }
  const user = getUser(database, "id", targetId, viewerId);
  if (!user) throw new Error("user missing after follow");
  return user;
}

export function getProfile(
  database: DatabaseSync,
  handle: string,
  viewer: string,
): User {
  const user = getUser(database, "handle", handle, viewer);
  if (!user) {
    throw problem(404, "user_not_found", "用户不存在");
  }
  return user;
}

export function getUserPosts(
  database: DatabaseSync,
  handle: string,
  viewer: string,
  cursor: string,
) {
  const user = getProfile(database, handle, viewer);
  const page = getPage(database, viewer, user.id, cursor);
  return { user, items: page.items, nextCursor: page.nextCursor };
}
