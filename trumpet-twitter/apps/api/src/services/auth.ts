import bcrypt from 'bcryptjs'
import type { LoginBody, RegisterBody } from '@trumpet/shared'
import type { createSessionRepository } from '../repositories/sessions.js'
import type { createUserRepository } from '../repositories/users.js'
import type { ReturnTypeOfRepository } from './types.js'

export class AuthError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

interface AuthRepositories {
  users: ReturnTypeOfRepository<typeof createUserRepository>
  sessions: ReturnTypeOfRepository<typeof createSessionRepository>
}

export const createAuthService = ({ users, sessions }: AuthRepositories) => ({
  register: async (body: RegisterBody) => {
    const existing = users.findByHandle(body.handle)

    if (existing) {
      throw new AuthError('handle_taken', '这个 handle 已经被占用')
    }

    const passwordHash = await bcrypt.hash(body.password, 12)
    const user = users.create({
      handle: body.handle,
      displayName: body.displayName,
      passwordHash,
    })
    const session = sessions.create(user.id)

    return { user, session }
  },

  login: async (body: LoginBody) => {
    const user = users.findByHandle(body.handle)

    if (!user) {
      throw new AuthError('invalid_credentials', '账号或密码不正确', 401)
    }

    const matches = await bcrypt.compare(body.password, user.passwordHash)

    if (!matches) {
      throw new AuthError('invalid_credentials', '账号或密码不正确', 401)
    }

    const session = sessions.create(user.id)
    return { user, session }
  },

  logout: (sessionId: string | undefined) => {
    if (sessionId) {
      sessions.delete(sessionId)
    }
  },

  getUserBySession: (sessionId: string | undefined) => {
    if (!sessionId) {
      return null
    }

    return sessions.findUserBySessionId(sessionId)
  },
})
