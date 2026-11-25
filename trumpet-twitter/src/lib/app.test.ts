/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { getConfig, resetConfig, setConfig, validateWebOrigin } from "./config";
import { closeDb, getDb, useDatabase } from "./db";
import {
  login,
  logout,
  me,
  parseAuthBody,
  readSessionId,
  register,
  requireViewer,
  viewerId,
} from "./auth";
import { createPost, parseCreatePostBody, setLike, timeline } from "./posts";
import { getUserPosts, setFollow } from "./users";
import { seedDemo } from "./seed";
import { RequestError } from "./http";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as meRoute } from "@/app/api/me/route";
import { GET as timelineRoute } from "@/app/api/timeline/route";
import { POST as postsRoute } from "@/app/api/posts/route";
import {
  DELETE as unlikeRoute,
  POST as likeRoute,
} from "@/app/api/posts/[id]/like/route";
import {
  DELETE as unfollowRoute,
  POST as followRoute,
} from "@/app/api/users/[id]/follow/route";

afterEach(() => {
  closeDb();
  resetConfig();
});

function tempDb(): DatabaseSync {
  const dir = mkdtempSync(join(tmpdir(), "trumpet-"));
  const file = join(dir, "app.db");
  setConfig({ cookieSecure: false, webOrigin: "", dbFile: file });
  return useDatabase(file);
}

function cookieHeader(token: string) {
  return `session_id=${token}`;
}

describe("social flow", () => {
  it("covers follow, like, reply, pagination, session, logout, login", async () => {
    const db = tempDb();
    const alice = await register(db, {
      handle: "alice",
      displayName: "Ada",
      password: "password123",
    });
    const bob = await register(db, {
      handle: "bobby",
      displayName: "Ada",
      password: "password123",
    });

    expect(() =>
      requireViewer(new Request("http://localhost/api/timeline")),
    ).toThrow(RequestError);

    const post = createPost(db, bob.user.id, { body: "hello" });
    expect(timeline(db, alice.user.id, "").items).toHaveLength(0);

    setFollow(db, alice.user.id, bob.user.id, true);
    expect(timeline(db, alice.user.id, "").items).toHaveLength(1);

    let liked = setLike(db, alice.user.id, post.id, true);
    liked = setLike(db, alice.user.id, post.id, true);
    expect(liked.likeCount).toBe(1);

    createPost(db, alice.user.id, { body: "reply", parentId: post.id });
    liked = setLike(db, alice.user.id, post.id, true);
    expect(liked.replyCount).toBe(1);

    expect(() => setFollow(db, alice.user.id, alice.user.id, true)).toThrow(
      RequestError,
    );

    for (let i = 0; i < 25; i++) {
      createPost(db, alice.user.id, { body: `post ${i}` });
    }
    const page1 = timeline(db, alice.user.id, "");
    expect(page1.items).toHaveLength(20);
    expect(page1.nextCursor).toBeTruthy();
    const seen = new Set(page1.items.map((p) => p.id));
    const page2 = timeline(db, alice.user.id, page1.nextCursor!);
    expect(page2.items).toHaveLength(6);
    for (const p of page2.items) {
      expect(seen.has(p.id)).toBe(false);
    }

    const file = getConfig().dbFile;
    closeDb();
    const reopened = useDatabase(file);
    const req = new Request("http://localhost/api/me", {
      headers: { cookie: cookieHeader(alice.token) },
    });
    expect(me(reopened, req)?.id).toBe(alice.user.id);

    logout(reopened, alice.token);
    expect(viewerId(req, reopened)).toBe("");

    const again = await login(reopened, {
      handle: "alice",
      password: "password123",
    });
    expect(again.user.handle).toBe("alice");
  });
});

describe("validation", () => {
  it("rejects bad posts, duplicate handle, bad password, cross-origin", async () => {
    const db = tempDb();
    const alice = await register(db, {
      handle: "alice",
      displayName: "Ada",
      password: "password123",
    });

    for (const body of [
      { body: "" },
      { body: "x", parentId: "wrong" },
      { body: "字".repeat(281) },
    ]) {
      expect(() => createPost(db, alice.user.id, body as never)).toThrow(
        RequestError,
      );
    }

    expect(() =>
      parseCreatePostBody(JSON.parse('{"body":"x","extra":1}')),
    ).toThrow(RequestError);

    await expect(
      register(db, {
        handle: "alice",
        displayName: "X",
        password: "password123",
      }),
    ).rejects.toMatchObject({ code: "handle_taken", status: 409 });

    await expect(
      login(db, { handle: "alice", password: "wrongpass" }),
    ).rejects.toMatchObject({ code: "invalid_credentials", status: 401 });

    const res = await logoutRoute(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          cookie: cookieHeader(alice.token),
          Host: "localhost",
        },
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe("seed", () => {
  it("seeds once and preserves existing data", async () => {
    const db = tempDb();
    await seedDemo(db);
    await expect(seedDemo(db)).rejects.toThrow(/empty database/);
    const session = await login(db, {
      handle: "mina",
      password: "password123",
    });
    expect(timeline(db, session.user.id, "").items).toHaveLength(3);
  });
});

describe("config", () => {
  it("rejects invalid WEB_ORIGIN values", () => {
    for (const origin of [
      "ftp://app.example",
      "https://",
      "https://app.example/path",
      "https://app.example?x=1",
      "https://app.example#fragment",
      "https://user:pass@app.example",
    ]) {
      expect(() => validateWebOrigin(origin)).toThrow(/WEB_ORIGIN/);
    }
  });

  it("honors explicit cookie secure and origin", async () => {
    const dir = mkdtempSync(join(tmpdir(), "trumpet-"));
    const file = join(dir, "app.db");
    setConfig({
      cookieSecure: true,
      webOrigin: "https://app.example",
      dbFile: file,
    });
    useDatabase(file);

    const res = await registerRoute(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          Origin: "https://app.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          handle: "alice",
          displayName: "Ada",
          password: "password123",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("secure");

    const token = setCookie.match(/session_id=([^;]+)/)?.[1];
    expect(token).toBeTruthy();

    const rejected = await logoutRoute(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          Origin: "https://wrong.example",
          cookie: `session_id=${token}`,
        },
      }),
    );
    expect(rejected.status).toBe(403);

    const meRes = await meRoute(
      new Request("http://localhost/api/me", {
        headers: { cookie: `session_id=${token}` },
      }),
    );
    const meBody = (await meRes.json()) as { user: { handle: string } | null };
    expect(meBody.user?.handle).toBe("alice");

    const accepted = await logoutRoute(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: {
          Origin: "https://app.example",
          cookie: `session_id=${token}`,
        },
      }),
    );
    expect(accepted.status).toBe(204);
  });
});

describe("cursor and http routes", () => {
  it("returns invalid_cursor for bad cursors", async () => {
    const db = tempDb();
    const alice = await register(db, {
      handle: "alice",
      displayName: "Ada",
      password: "password123",
    });
    const res = await timelineRoute(
      new Request("http://localhost/api/timeline?cursor=not-a-valid-cursor", {
        headers: { cookie: cookieHeader(alice.token) },
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("invalid_cursor");
  });

  it("posts/like/follow/login route handlers work", async () => {
    const db = tempDb();
    const alice = await register(db, {
      handle: "alice",
      displayName: "Ada",
      password: "password123",
    });
    const bob = await register(db, {
      handle: "bobby",
      displayName: "Bob",
      password: "password123",
    });

    const created = await postsRoute(
      new Request("http://localhost/api/posts", {
        method: "POST",
        headers: {
          cookie: cookieHeader(bob.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "hello route" }),
      }),
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { post: { id: string } };

    const liked = await likeRoute(
      new Request(`http://localhost/api/posts/${createdBody.post.id}/like`, {
        method: "POST",
        headers: { cookie: cookieHeader(alice.token) },
      }),
      { params: Promise.resolve({ id: createdBody.post.id }) },
    );
    expect(liked.status).toBe(200);

    await unlikeRoute(
      new Request(`http://localhost/api/posts/${createdBody.post.id}/like`, {
        method: "DELETE",
        headers: { cookie: cookieHeader(alice.token) },
      }),
      { params: Promise.resolve({ id: createdBody.post.id }) },
    );

    const followed = await followRoute(
      new Request(`http://localhost/api/users/${bob.user.id}/follow`, {
        method: "POST",
        headers: { cookie: cookieHeader(alice.token) },
      }),
      { params: Promise.resolve({ id: bob.user.id }) },
    );
    expect(followed.status).toBe(200);

    await unfollowRoute(
      new Request(`http://localhost/api/users/${bob.user.id}/follow`, {
        method: "DELETE",
        headers: { cookie: cookieHeader(alice.token) },
      }),
      { params: Promise.resolve({ id: bob.user.id }) },
    );

    const loginRes = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: "alice", password: "password123" }),
      }),
    );
    expect(loginRes.status).toBe(200);

    expect(parseAuthBody({ handle: "x", password: "y" }).handle).toBe("x");
    expect(
      readSessionId(new Request("http://x", { headers: {} })),
    ).toBeUndefined();
    expect(getDb()).toBe(db);

    const posts = getUserPosts(db, "bobby", alice.user.id, "");
    expect(posts.user.handle).toBe("bobby");
  });
});
