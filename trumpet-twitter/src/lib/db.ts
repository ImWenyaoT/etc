import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getConfig } from "./config";
import type { Post, User } from "./types";
import { problem } from "./http";

let db: DatabaseSync | null = null;
let openedFile: string | null = null;

function loadSchema(): string {
  return readFileSync(join(process.cwd(), "src/lib/schema.sql"), "utf8");
}

export function openDatabase(file: string): DatabaseSync {
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  }
  const database = new DatabaseSync(file);
  database.exec(loadSchema());
  database.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  return database;
}

export function getDb(): DatabaseSync {
  const file = getConfig().dbFile;
  if (!db || openedFile !== file) {
    if (db) {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
    db = openDatabase(file);
    openedFile = file;
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    db = null;
    openedFile = null;
  }
}

export function useDatabase(file: string): DatabaseSync {
  closeDb();
  db = openDatabase(file);
  openedFile = file;
  return db;
}

export function asBool(value: unknown): boolean {
  return value === 1 || value === true || value === 1n;
}

export function getUser(
  database: DatabaseSync,
  column: "id" | "handle",
  value: string,
  viewer: string,
): User | null {
  const row = database
    .prepare(
      `SELECT id, handle, display_name, bio, created_at FROM users WHERE ${column} = ?`,
    )
    .get(value) as
    | {
        id: string;
        handle: string;
        display_name: string;
        bio: string;
        created_at: string;
      }
    | undefined;
  if (!row) return null;

  const counts = database
    .prepare(
      `SELECT
        (SELECT count(*) FROM follows WHERE following_id = ?) AS follower_count,
        (SELECT count(*) FROM follows WHERE follower_id = ?) AS following_count,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS followed_by_me`,
    )
    .get(row.id, row.id, viewer, row.id) as {
    follower_count: number | bigint;
    following_count: number | bigint;
    followed_by_me: number | bigint;
  };

  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    createdAt: row.created_at,
    followerCount: Number(counts.follower_count),
    followingCount: Number(counts.following_count),
    followedByMe: asBool(counts.followed_by_me),
  };
}

const postSelect = `SELECT p.id, p.body, p.parent_id, p.created_at,
  u.id AS author_id, u.handle AS author_handle, u.display_name AS author_display_name,
  u.bio AS author_bio, u.created_at AS author_created_at,
  (SELECT count(*) FROM likes WHERE post_id = p.id) AS like_count,
  (SELECT count(*) FROM posts WHERE parent_id = p.id) AS reply_count,
  EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS liked_by_me
  FROM posts p JOIN users u ON u.id = p.author_id `;

type PostRow = {
  id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author_id: string;
  author_handle: string;
  author_display_name: string;
  author_bio: string;
  author_created_at: string;
  like_count: number | bigint;
  reply_count: number | bigint;
  liked_by_me: number | bigint;
};

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    body: row.body,
    parentId: row.parent_id,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      handle: row.author_handle,
      displayName: row.author_display_name,
      bio: row.author_bio,
      createdAt: row.author_created_at,
      followerCount: 0,
      followingCount: 0,
      followedByMe: false,
    },
    likeCount: Number(row.like_count),
    replyCount: Number(row.reply_count),
    likedByMe: asBool(row.liked_by_me),
  };
}

export function getPost(
  database: DatabaseSync,
  id: string,
  viewer: string,
): Post | null {
  const row = database
    .prepare(postSelect + "WHERE p.id = ?")
    .get(viewer, id) as PostRow | undefined;
  return row ? mapPost(row) : null;
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString(
    "base64url",
  );
}

function decodeCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const c = JSON.parse(raw) as { createdAt?: string; id?: string };
    if (!c.createdAt || !c.id) {
      throw new Error("invalid");
    }
    return { createdAt: c.createdAt, id: c.id };
  } catch {
    throw problem(400, "invalid_cursor", "分页游标无效");
  }
}

export function getPage(
  database: DatabaseSync,
  viewer: string,
  author: string,
  cursor: string,
): { items: Post[]; nextCursor: string | null } {
  let where =
    "p.parent_id IS NULL AND (p.author_id = ? OR EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.author_id))";
  const args: string[] = [viewer, viewer, viewer];

  if (author) {
    where = "p.parent_id IS NULL AND p.author_id = ?";
    args.length = 0;
    args.push(viewer, author);
  }

  if (cursor) {
    const c = decodeCursor(cursor);
    where += " AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))";
    args.push(c.createdAt, c.createdAt, c.id);
  }

  const rows = database
    .prepare(
      postSelect +
        `WHERE ${where} ORDER BY p.created_at DESC, p.id DESC LIMIT 21`,
    )
    .all(...args) as PostRow[];

  const items = rows.map(mapPost);
  if (items.length > 20) {
    const page = items.slice(0, 20);
    const last = page[19]!;
    return { items: page, nextCursor: encodeCursor(last.createdAt, last.id) };
  }
  return { items, nextCursor: null };
}

export function getSessionUserId(
  database: DatabaseSync,
  sessionId: string | undefined,
  nowIso: string,
): string {
  if (!sessionId) return "";
  const row = database
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .get(sessionId, nowIso) as { user_id: string } | undefined;
  return row?.user_id ?? "";
}
