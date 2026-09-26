import { randomUUID } from 'node:crypto'
import type { DatabaseClient } from '../db/client.js'
import type { StoredUser } from './types.js'

const sessionDays = 30

interface SessionUserRow {
  id: string
  handle: string
  display_name: string
  bio: string
  password_hash: string
  created_at: string
}

const toStoredUser = (row: SessionUserRow): StoredUser => ({
  id: row.id,
  handle: row.handle,
  displayName: row.display_name,
  bio: row.bio,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
})

export const createSessionRepository = (client: DatabaseClient) => {
  const userBySessionStatement = client.sqlite.prepare(`
    SELECT u.id, u.handle, u.display_name, u.bio, u.password_hash, u.created_at
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?
  `)
  const deleteExpiredStatement = client.sqlite.prepare('DELETE FROM sessions WHERE expires_at <= ?')

  const deleteExpired = () => {
    deleteExpiredStatement.run(new Date().toISOString())
  }

  return {
    create: (userId: string) => {
      deleteExpired()

      const now = new Date()
      const expiresAt = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000)
      const id = randomUUID()

      client.sqlite
        .prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .run(id, userId, expiresAt.toISOString(), now.toISOString())

      return {
        id,
        expiresAt,
      }
    },

    findUserBySessionId: (sessionId: string) => {
      const row = userBySessionStatement.get(sessionId, new Date().toISOString()) as
        | SessionUserRow
        | undefined
      return row ? toStoredUser(row) : null
    },

    delete: (sessionId: string) => {
      client.sqlite.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    },

    deleteExpired,
  }
}
