import { randomUUID } from 'node:crypto'
import type { DatabaseClient } from '../db/client.js'
import type { StoredUser, UserStats } from './types.js'

interface UserRow {
  id: string
  handle: string
  display_name: string
  bio: string
  password_hash: string
  created_at: string
}

const toStoredUser = (row: UserRow): StoredUser => ({
  id: row.id,
  handle: row.handle,
  displayName: row.display_name,
  bio: row.bio,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
})

export const createUserRepository = (client: DatabaseClient) => {
  const findByHandleStatement = client.sqlite.prepare<string, UserRow>(`
    SELECT id, handle, display_name, bio, password_hash, created_at
    FROM users
    WHERE handle = ?
  `)

  const findByIdStatement = client.sqlite.prepare<string, UserRow>(`
    SELECT id, handle, display_name, bio, password_hash, created_at
    FROM users
    WHERE id = ?
  `)

  const statsStatement = client.sqlite.prepare(`
    SELECT
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followerCount,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS followingCount,
      CASE
        WHEN ? IS NULL THEN 0
        WHEN EXISTS (
          SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?
        ) THEN 1
        ELSE 0
      END AS followedByMe
  `)

  const insertUserStatement = client.sqlite.prepare(
    'INSERT INTO users (id, handle, display_name, bio, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )

  return {
    create: (input: { handle: string; displayName: string; passwordHash: string }) => {
      const user = {
        id: randomUUID(),
        handle: input.handle,
        displayName: input.displayName,
        bio: '',
        passwordHash: input.passwordHash,
        createdAt: new Date().toISOString(),
      }

      insertUserStatement.run(
        user.id,
        user.handle,
        user.displayName,
        user.bio,
        user.passwordHash,
        user.createdAt,
      )

      return user
    },

    findByHandle: (handle: string) => {
      const row = findByHandleStatement.get(handle)
      return row ? toStoredUser(row) : null
    },

    findById: (id: string) => {
      const row = findByIdStatement.get(id)
      return row ? toStoredUser(row) : null
    },

    getStats: (userId: string, viewerId: string | null) => {
      const row = statsStatement.get(userId, userId, viewerId, viewerId, userId) as
        | UserStats
        | undefined

      return {
        followerCount: Number(row?.followerCount ?? 0),
        followingCount: Number(row?.followingCount ?? 0),
        followedByMe: Boolean(row?.followedByMe),
      }
    },

    follow: (followerId: string, followingId: string) => {
      client.sqlite
        .prepare(
          'INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)',
        )
        .run(followerId, followingId, new Date().toISOString())
    },

    unfollow: (followerId: string, followingId: string) => {
      client.sqlite
        .prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
        .run(followerId, followingId)
    },

    exists: (id: string) => {
      return Boolean(client.sqlite.prepare('SELECT 1 FROM users WHERE id = ?').get(id))
    },

    deleteAll: () => {
      client.sqlite.prepare('DELETE FROM users').run()
    },
  }
}
