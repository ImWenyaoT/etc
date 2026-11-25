import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { DatabaseSync } from "node:sqlite";
import { getConfig } from "./config";
import { getDb, getSessionUserId, getUser } from "./db";
import { formatUtc, problem } from "./http";
import type { User } from "./types";

const handlePattern = /^[a-z0-9_]{3,20}$/;

/** Dummy bcrypt hash so missing users still pay compare cost (same as Go). */
const DUMMY_HASH =
  "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export function sessionCookieOptions(expires: Date) {
  const config = getConfig();
  return {
    name: "session_id",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookieSecure,
    path: "/",
    expires,
  };
}

export function clearSessionCookieOptions() {
  const config = getConfig();
  return {
    name: "session_id",
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookieSecure,
    path: "/",
    maxAge: 0,
  };
}

export function readSessionId(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === "session_id") {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

export function viewerId(request: Request, database = getDb()): string {
  return getSessionUserId(database, readSessionId(request), formatUtc());
}

export function requireViewer(request: Request, database = getDb()): string {
  const id = viewerId(request, database);
  if (!id) throw problem(401, "unauthorized", "请先登录。");
  return id;
}

function runeLength(s: string): number {
  return Array.from(s).length;
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export interface AuthBody {
  handle: string;
  displayName?: string;
  password: string;
}

export function parseAuthBody(value: unknown): AuthBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  const obj = value as Record<string, unknown>;
  const allowed = new Set(["handle", "displayName", "password"]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
    }
  }
  if (typeof obj.handle !== "string" || typeof obj.password !== "string") {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  if (obj.displayName !== undefined && typeof obj.displayName !== "string") {
    throw problem(400, "invalid_body", "提交内容有误，请刷新后重试。");
  }
  return {
    handle: obj.handle,
    displayName: obj.displayName,
    password: obj.password,
  };
}

export async function register(
  database: DatabaseSync,
  body: AuthBody,
): Promise<{ user: User; token: string; expires: Date }> {
  if (
    !handlePattern.test(body.handle) ||
    runeLength(body.password) < 8 ||
    byteLength(body.password) > 72
  ) {
    throw problem(400, "invalid_input", "账号或密码不符合要求。");
  }
  const displayName = (body.displayName ?? "").trim();
  const n = runeLength(displayName);
  if (n < 1 || n > 80) {
    throw problem(400, "invalid_input", "昵称需为1～80字。");
  }
  if (getUser(database, "handle", body.handle, "")) {
    throw problem(409, "handle_taken", "账号已被使用，请换一个。");
  }
  const hash = await bcrypt.hash(body.password, 12);
  const id = uuidv4();
  const created = formatUtc();
  try {
    database
      .prepare(
        "INSERT INTO users(id, handle, display_name, bio, password_hash, created_at) VALUES(?, ?, ?, '', ?, ?)",
      )
      .run(id, body.handle, displayName, hash, created);
  } catch (err) {
    if (getUser(database, "handle", body.handle, "")) {
      throw problem(409, "handle_taken", "账号已被使用，请换一个。");
    }
    throw err;
  }
  return createSession(database, id);
}

export async function login(
  database: DatabaseSync,
  body: AuthBody,
): Promise<{ user: User; token: string; expires: Date }> {
  if (
    !handlePattern.test(body.handle) ||
    runeLength(body.password) < 8 ||
    byteLength(body.password) > 72
  ) {
    throw problem(400, "invalid_input", "账号或密码不符合要求。");
  }
  const row = database
    .prepare("SELECT id, password_hash FROM users WHERE handle = ?")
    .get(body.handle) as { id: string; password_hash: string } | undefined;

  const hash = row?.password_hash ?? DUMMY_HASH;
  const match = await bcrypt.compare(body.password, hash);
  if (!row || !match) {
    throw problem(401, "invalid_credentials", "账号或密码不正确，请重新输入。");
  }
  return createSession(database, row.id);
}

function createSession(
  database: DatabaseSync,
  userId: string,
): { user: User; token: string; expires: Date } {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const token = uuidv4();
  const nowIso = formatUtc();
  database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso);
  database
    .prepare(
      "INSERT INTO sessions(id, user_id, expires_at, created_at) VALUES(?, ?, ?, ?)",
    )
    .run(token, userId, formatUtc(expires), nowIso);
  const user = getUser(database, "id", userId, userId);
  if (!user) throw new Error("user missing after auth");
  return { user, token, expires };
}

export function logout(database: DatabaseSync, sessionId: string | undefined) {
  if (sessionId) {
    database.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
}

export function me(database: DatabaseSync, request: Request): User | null {
  const id = viewerId(request, database);
  if (!id) return null;
  return getUser(database, "id", id, id);
}
