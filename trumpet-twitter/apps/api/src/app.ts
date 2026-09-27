import type Database from 'better-sqlite3'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Request, type RequestHandler, type Response } from 'express'
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
import { toUserView, type StoredUser } from './repositories/types.js'
import { createUserRepository } from './repositories/users.js'
import { createAuthService } from './services/auth.js'

const sessionCookieName = 'session_id'

export interface AppOptions {
  dbFile?: string
  sqlite?: Database.Database
}

type AsyncRoute = (request: Request, response: Response) => void | Promise<void>

const wrap =
  (handler: AsyncRoute): RequestHandler =>
  (request, response, next) => {
    Promise.resolve(handler(request, response)).catch(next)
  }

const setSessionCookie = (response: Response, session: { id: string; expiresAt: Date }) => {
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

  const viewerId = (request: Request) => request.currentUser!.id
  const optionalViewerId = (request: Request) => request.currentUser?.id ?? null
  const queryCursor = (request: Request) =>
    typeof request.query.cursor === 'string' ? request.query.cursor : null
  const missing = (code: string, message: string, status = 404): never => {
    throw new HttpError(code, message, status)
  }

  const requirePost = (id: string) => {
    if (!posts.exists(id)) missing('post_not_found', '帖子不存在')
  }

  const requireParentPost = (parentId: string | null | undefined) => {
    if (parentId && !posts.exists(parentId)) missing('parent_not_found', '回复的帖子不存在')
  }

  const requireUserById = (id: string) =>
    users.findById(id) ?? missing('user_not_found', '用户不存在')

  const userView = (stored: StoredUser, viewer: string | null) =>
    toUserView(stored, users.getStats(stored.id, viewer))

  const loadProfileByHandle = (handle: string, viewer: string | null) => {
    const stored = users.findByHandle(handle) ?? missing('user_not_found', '用户不存在')
    return { stored, view: userView(stored, viewer) }
  }

  const handleFrom = (request: Request) => userParamsSchema.parse(request.params).handle

  const beginFollow = (viewer: string, id: string) => {
    const stored = requireUserById(id)
    if (viewer === id) missing('self_follow_not_allowed', '不能关注自己', 400)
    users.follow(viewer, id)
    return stored
  }

  const endFollow = (viewer: string, id: string) => {
    users.unfollow(viewer, id)
    return requireUserById(id)
  }

  const mutateLike = (liked: boolean): RequestHandler =>
    wrap((request, response) => {
      const { id } = postParamsSchema.parse(request.params)
      const viewer = viewerId(request)
      requirePost(id)
      if (liked) posts.like(viewer, id)
      else posts.unlike(viewer, id)
      response.json({ post: posts.findById(id, viewer) })
    })

  const mutateFollow = (following: boolean): RequestHandler =>
    wrap((request, response) => {
      const { id } = followParamsSchema.parse(request.params)
      const viewer = viewerId(request)
      const stored = following ? beginFollow(viewer, id) : endFollow(viewer, id)
      response.json({ user: userView(stored, viewer) })
    })

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
      requireParentPost(body.parentId)
      const viewer = viewerId(request)
      const id = posts.create({
        authorId: viewer,
        body: body.body,
        parentId: body.parentId ?? null,
      })
      response.status(201).json({ post: posts.findById(id, viewer) })
    }),
  )

  app.get('/timeline', requireAuth, (request, response) => {
    response.json(posts.timeline(viewerId(request), queryCursor(request)))
  })

  app.post('/posts/:id/like', requireAuth, mutateLike(true))
  app.delete('/posts/:id/like', requireAuth, mutateLike(false))

  app.post('/users/:id/follow', requireAuth, mutateFollow(true))
  app.delete('/users/:id/follow', requireAuth, mutateFollow(false))

  app.get(
    '/users/:handle',
    wrap((request, response) => {
      const profile = loadProfileByHandle(handleFrom(request), optionalViewerId(request))
      response.json({ user: profile.view })
    }),
  )

  app.get(
    '/users/:handle/posts',
    wrap((request, response) => {
      const profile = loadProfileByHandle(handleFrom(request), optionalViewerId(request))
      response.json({
        user: profile.view,
        ...posts.byAuthor(profile.stored.id, request.currentUser?.id ?? '', queryCursor(request)),
      })
    }),
  )

  app.use(errorHandler)
  return { app, client }
}
