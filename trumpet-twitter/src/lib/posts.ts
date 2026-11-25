import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import type { DatabaseSync } from "node:sqlite";
import { getPage, getPost } from "./db";
import { formatUtc, problem } from "./http";
import type { Post } from "./types";

export interface CreatePostBody {
  body: string;
  parentId?: string | null;
}

export function parseCreatePostBody(value: unknown): CreatePostBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  const obj = value as Record<string, unknown>;
  const allowed = new Set(["body", "parentId"]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
    }
  }
  if (typeof obj.body !== "string") {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  if (
    obj.parentId !== undefined &&
    obj.parentId !== null &&
    typeof obj.parentId !== "string"
  ) {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  return {
    body: obj.body,
    parentId: (obj.parentId as string | null | undefined) ?? undefined,
  };
}

export function createPost(
  database: DatabaseSync,
  authorId: string,
  input: CreatePostBody,
): Post {
  const body = input.body.trim();
  const n = Array.from(body).length;
  if (n < 1 || n > 280) {
    throw problem(400, "invalid_input", "帖子需为1～280字。");
  }
  let parentId: string | null = null;
  if (input.parentId != null && input.parentId !== "") {
    if (!uuidValidate(input.parentId)) {
      throw problem(400, "invalid_input", "无法回复这条帖子。");
    }
    const parent = getPost(database, input.parentId, authorId);
    if (!parent) {
      throw problem(404, "parent_not_found", "要回复的帖子不存在。");
    }
    parentId = input.parentId;
  }
  const id = uuidv4();
  database
    .prepare(
      "INSERT INTO posts(id, author_id, body, parent_id, created_at) VALUES(?, ?, ?, ?, ?)",
    )
    .run(id, authorId, body, parentId, formatUtc());
  const post = getPost(database, id, authorId);
  if (!post) throw new Error("post missing after insert");
  return post;
}

export function setLike(
  database: DatabaseSync,
  userId: string,
  postId: string,
  liked: boolean,
): Post {
  const existing = getPost(database, postId, userId);
  if (!existing) {
    throw problem(404, "post_not_found", "这条帖子不存在。");
  }
  if (liked) {
    database
      .prepare(
        "INSERT OR IGNORE INTO likes(user_id, post_id, created_at) VALUES(?, ?, ?)",
      )
      .run(userId, postId, formatUtc());
  } else {
    database
      .prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?")
      .run(userId, postId);
  }
  const post = getPost(database, postId, userId);
  if (!post) throw new Error("post missing after like");
  return post;
}

export function timeline(
  database: DatabaseSync,
  viewer: string,
  cursor: string,
) {
  return getPage(database, viewer, "", cursor);
}
