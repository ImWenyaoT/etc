import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import type Database from 'better-sqlite3'
import {
  createPostBodySchema,
  followParamsSchema,
  loginBodySchema,
  postParamsSchema,
  registerBodySchema,
  userParamsSchema,
} from '@trumpet/shared'
import { createDatabaseClient } from './db/client.js'
import { requireAuth } from './http/context.js'
import { errorHandler, HttpError } from './http/errors.js'
import { createPostRepository } from './repositories/posts.js'
import { createSessionRepository } from './repositories/sessions.js'
import { toUserView } from './repositories/types.js'
import { createUserRepository } from './repositories/users.js'
import { createAuthService } from './services/auth.js'

const sessionCookieName = 'session_id'

export interface AppOptions {
  dbFile?: string
  sqlite?: Database.Database
}

type AsyncRoute = (request: express.Request, response: express.Response) => void | Promise<void>

const wrap =
  (handler: AsyncRoute): express.RequestHandler =>
  (request, response, next) => {
    Promise.resolve(handler(request, response)).catch(next)
  }

const setSessionCookie = (response: express.Response, session: { id: string; expiresAt: Date }) => {
  response.cookie(sessionCookieName, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    expires: session.expiresAt,
    secure: false,
  })
}

export const createApp = (options: AppOptions = {}) => {
  const client = createDatabaseClient({
    ...(options.dbFile ? { filePath: options.dbFile } : {}),
    ...(options.sqlite ? { sqlite: options.sqlite } : {}),
  })
  const users = createUserRepository(client)
  const sessions = createSessionRepository(client)
  const posts = createPostRepository(client)
  const auth = createAuthService({ users, sessions })
  const app = express()
  const viewerId = (request: express.Request) => request.currentUser!.id
  const queryCursor = (request: express.Request) =>
    typeof request.query.cursor === 'string' ? request.query.cursor : null

  app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use((request, _response, next) => {
    request.currentUser = auth.getUserBySession(request.cookies?.[sessionCookieName])
    next()
  })

  app.get('/health', (_request, response) => {
    response.json({ ok: true })
  })

  app.post(
    '/auth/register',
    wrap(async (request, response) => {
      const result = await auth.register(registerBodySchema.parse(request.body))
      setSessionCookie(response, result.session)
      response.status(201).json({ user: toUserView(result.user) })
    }),
  )

  app.post(
    '/auth/login',
    wrap(async (request, response) => {
      const result = await auth.login(loginBodySchema.parse(request.body))
      setSessionCookie(response, result.session)
      response.json({ user: toUserView(result.user) })
    }),
  )

  app.post('/auth/logout', (request, response) => {
    auth.logout(request.cookies?.[sessionCookieName])
    response.clearCookie(sessionCookieName)
    response.status(204).end()
  })

  app.get('/me', (request, response) => {
    response.json({ user: request.currentUser ? toUserView(request.currentUser) : null })
  })

  app.post(
    '/posts',
    requireAuth,
    wrap((request, response) => {
      const body = createPostBodySchema.parse(request.body)
      if (body.parentId && !posts.exists(body.parentId)) {
        throw new HttpError('parent_not_found', '回复的帖子不存在', 404)
      }
      const id = posts.create({
        authorId: viewerId(request),
        body: body.body,
        parentId: body.parentId ?? null,
      })
      response.status(201).json({ post: posts.findById(id, viewerId(request)) })
    }),
  )

  app.get('/timeline', requireAuth, (request, response) => {
    response.json(posts.timeline(viewerId(request), queryCursor(request)))
  })

  const mutateLike = (liked: boolean): express.RequestHandler =>
    wrap((request, response) => {
      const { id } = postParamsSchema.parse(request.params)
      if (!posts.exists(id)) {
        throw new HttpError('post_not_found', '帖子不存在', 404)
      }
      if (liked) {
        posts.like(viewerId(request), id)
      } else {
        posts.unlike(viewerId(request), id)
      }
      response.json({ post: posts.findById(id, viewerId(request)) })
    })

  app.post('/posts/:id/like', requireAuth, mutateLike(true))
  app.delete('/posts/:id/like', requireAuth, mutateLike(false))

  app.post(
    '/users/:id/follow',
    requireAuth,
    wrap((request, response) => {
      const { id } = followParamsSchema.parse(request.params)
      if (!users.exists(id)) {
        throw new HttpError('user_not_found', '用户不存在', 404)
      }
      if (viewerId(request) === id) {
        throw new HttpError('self_follow_not_allowed', '不能关注自己', 400)
      }
      users.follow(viewerId(request), id)
      response.json({
        user: toUserView(users.findById(id)!, users.getStats(id, viewerId(request))),
      })
    }),
  )

  app.delete(
    '/users/:id/follow',
    requireAuth,
    wrap((request, response) => {
      const { id } = followParamsSchema.parse(request.params)
      users.unfollow(viewerId(request), id)
      const user = users.findById(id)
      if (!user) {
        throw new HttpError('user_not_found', '用户不存在', 404)
      }
      response.json({ user: toUserView(user, users.getStats(id, viewerId(request))) })
    }),
  )

  app.get(
    '/users/:handle',
    wrap((request, response) => {
      const { handle } = userParamsSchema.parse(request.params)
      const user = users.findByHandle(handle)
      if (!user) {
        throw new HttpError('user_not_found', '用户不存在', 404)
      }
      response.json({
        user: toUserView(user, users.getStats(user.id, request.currentUser?.id ?? null)),
      })
    }),
  )

  app.get(
    '/users/:handle/posts',
    wrap((request, response) => {
      const { handle } = userParamsSchema.parse(request.params)
      const user = users.findByHandle(handle)
      if (!user) {
        throw new HttpError('user_not_found', '用户不存在', 404)
      }
      response.json({
        user: toUserView(user, users.getStats(user.id, request.currentUser?.id ?? null)),
        ...posts.byAuthor(user.id, request.currentUser?.id ?? '', queryCursor(request)),
      })
    }),
  )

  app.use(errorHandler)
  return { app, client }
}
