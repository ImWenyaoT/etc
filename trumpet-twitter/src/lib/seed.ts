import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { DatabaseSync } from "node:sqlite";
import { formatUtc } from "./http";

/**
 * Populate an empty database with demo accounts. Existing data is never deleted.
 * Throws if the users table is non-empty.
 */
export async function seedDemo(database: DatabaseSync): Promise<void> {
  database.exec("BEGIN");
  try {
    const row = database.prepare("SELECT count(*) AS c FROM users").get() as {
      c: number | bigint;
    };
    if (Number(row.c) !== 0) {
      database.exec("ROLLBACK");
      throw new Error(
        "demo seed requires an empty database; use a separate DB_FILE",
      );
    }

    const hash = await bcrypt.hash("password123", 12);
    const ids = [uuidv4(), uuidv4(), uuidv4()];
    const users = [
      { handle: "mina", name: "Mina Chen" },
      { handle: "leo", name: "Leo Park" },
      { handle: "ava", name: "Ava Stone" },
    ];
    const now = formatUtc();
    const insertUser = database.prepare(
      "INSERT INTO users(id, handle, display_name, bio, password_hash, created_at) VALUES(?, ?, ?, '', ?, ?)",
    );
    for (let i = 0; i < users.length; i++) {
      insertUser.run(ids[i], users[i]!.handle, users[i]!.name, hash, now);
    }

    const insertFollow = database.prepare(
      "INSERT INTO follows(follower_id, following_id, created_at) VALUES(?, ?, ?)",
    );
    for (const [a, b] of [
      [0, 1],
      [0, 2],
      [1, 0],
    ] as const) {
      insertFollow.run(ids[a], ids[b], now);
    }

    const first = uuidv4();
    const posts: { author: number; body: string; parent: string | null }[] = [
      { author: 1, body: "欢迎使用 Next.js 版 Trumpet。", parent: null },
      { author: 0, body: "用一个小项目练习完整的全栈流程。", parent: null },
      {
        author: 2,
        body: "关注、点赞与回复，都从简单的数据关系开始。",
        parent: null,
      },
      { author: 0, body: "回复也作为帖子保存。", parent: first },
    ];
    const insertPost = database.prepare(
      "INSERT INTO posts(id, author_id, body, parent_id, created_at) VALUES(?, ?, ?, ?, ?)",
    );
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i]!;
      const id = i === 0 ? first : uuidv4();
      insertPost.run(id, ids[p.author], p.body, p.parent, now);
    }

    const insertLike = database.prepare(
      "INSERT INTO likes(user_id, post_id, created_at) VALUES(?, ?, ?)",
    );
    for (const i of [0, 2]) {
      insertLike.run(ids[i], first, now);
    }

    database.exec("COMMIT");
  } catch (err) {
    try {
      database.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  }
}
