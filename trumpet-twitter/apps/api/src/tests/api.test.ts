import Database from 'better-sqlite3'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'

type TestApp = ReturnType<typeof createApp>
type Agent = ReturnType<typeof request.agent>

let testApp: TestApp
const missingId = '2e7db1ab-4f91-4a36-bf71-7a1396008c3d'

const registerAgent = async (handle: string, displayName = handle) => {
  const agent = request.agent(testApp.app)
  const response = await agent
    .post('/auth/register')
    .send({ handle, displayName, password: 'password123' })
    .expect(201)

  return {
    agent,
    user: response.body.user as { id: string; handle: string },
  }
}

const createPost = async (agent: Agent, body: string) => {
  const response = await agent.post('/posts').send({ body }).expect(201)
  return response.body.post as { id: string; body: string; likeCount: number }
}

const errorCode = (response: request.Response) => {
  return response.body.error?.code as string | undefined
}

beforeEach(() => {
  testApp = createApp({ sqlite: new Database(':memory:') })
})

afterEach(() => {
  testApp.client.sqlite.close()
})

describe('auth', () => {
  it('returns null for /me when the cookie is missing or stale', async () => {
    const health = await request(testApp.app).get('/health').expect(200)
    const missing = await request(testApp.app).get('/me').expect(200)
    const stale = await request(testApp.app)
      .get('/me')
      .set('Cookie', 'session_id=missing')
      .expect(200)

    expect(health.body).toEqual({ ok: true })
    expect(missing.body.user).toBeNull()
    expect(stale.body.user).toBeNull()
  })

  it('registers, reads /me, and logs out', async () => {
    const { agent } = await registerAgent('mina', 'Mina Chen')

    const me = await agent.get('/me').expect(200)
    expect(me.body.user.handle).toBe('mina')

    await agent.post('/auth/logout').expect(204)

    const afterLogout = await agent.get('/me').expect(200)
    expect(afterLogout.body.user).toBeNull()
  })

  it('rejects duplicate handles and invalid registration input', async () => {
    await registerAgent('mina', 'Mina Chen')

    const duplicate = await request(testApp.app)
      .post('/auth/register')
      .send({ handle: 'mina', displayName: 'Other Mina', password: 'password123' })
      .expect(400)

    const invalid = await request(testApp.app)
      .post('/auth/register')
      .send({ handle: 'no spaces', displayName: '', password: 'short' })
      .expect(400)

    expect(errorCode(duplicate)).toBe('handle_taken')
    expect(errorCode(invalid)).toBe('validation_error')
  })

  it('sets an http-only session cookie when registering', async () => {
    const response = await request(testApp.app)
      .post('/auth/register')
      .send({ handle: 'cookie', displayName: 'Cookie User', password: 'password123' })
      .expect(201)
    const setCookie = response.headers['set-cookie']
    const cookie = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '')

    expect(cookie).toContain('session_id=')
    expect(cookie).toContain('HttpOnly')
    expect(response.body.user).not.toHaveProperty('passwordHash')
  })

  it('logs in with an existing local account', async () => {
    await registerAgent('leo', 'Leo Park')

    const agent = request.agent(testApp.app)
    await agent.post('/auth/login').send({ handle: 'leo', password: 'password123' }).expect(200)

    const me = await agent.get('/me').expect(200)
    expect(me.body.user.handle).toBe('leo')
  })

  it('rejects invalid login credentials', async () => {
    await registerAgent('leo', 'Leo Park')

    const wrong = await request(testApp.app)
      .post('/auth/login')
      .send({ handle: 'leo', password: 'wrongpass' })
      .expect(401)
    const missing = await request(testApp.app)
      .post('/auth/login')
      .send({ handle: 'ghost', password: 'password123' })
      .expect(401)

    expect(errorCode(wrong)).toBe('invalid_credentials')
    expect(errorCode(missing)).toBe('invalid_credentials')
  })
})

describe('posts and timeline', () => {
  it('blocks timeline, likes, posts, and follows when unauthenticated', async () => {
    const post = await request(testApp.app).post('/posts').send({ body: 'No cookie' }).expect(401)
    const postLike = await request(testApp.app).post(`/posts/${missingId}/like`).expect(401)
    const follow = await request(testApp.app).post(`/users/${missingId}/follow`).expect(401)
    const timeline = await request(testApp.app).get('/timeline').expect(401)

    expect(errorCode(post)).toBe('unauthorized')
    expect(errorCode(postLike)).toBe('unauthorized')
    expect(errorCode(follow)).toBe('unauthorized')
    expect(errorCode(timeline)).toBe('unauthorized')
  })

  it('validates post body and parent id before creating posts', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')

    const empty = await mina.agent.post('/posts').send({ body: '   ' }).expect(400)
    const tooLong = await mina.agent
      .post('/posts')
      .send({ body: 'x'.repeat(281) })
      .expect(400)
    const missingParent = await mina.agent
      .post('/posts')
      .send({ body: 'Reply to nothing', parentId: missingId })
      .expect(404)

    expect(errorCode(empty)).toBe('validation_error')
    expect(errorCode(tooLong)).toBe('validation_error')
    expect(errorCode(missingParent)).toBe('parent_not_found')
  })

  it('shows own and followed users in the following timeline', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')
    const leo = await registerAgent('leo', 'Leo Park')
    const ava = await registerAgent('ava', 'Ava Stone')

    await createPost(leo.agent, 'Visible after following')
    await createPost(ava.agent, 'Hidden until followed')
    await createPost(mina.agent, 'My own post')

    let timeline = await mina.agent.get('/timeline').expect(200)
    expect(timeline.body.items.map((post: { body: string }) => post.body)).toEqual(['My own post'])

    await mina.agent.post(`/users/${leo.user.id}/follow`).expect(200)
    timeline = await mina.agent.get('/timeline').expect(200)
    expect(timeline.body.items.map((post: { body: string }) => post.body)).toEqual([
      'My own post',
      'Visible after following',
    ])

    await mina.agent.post(`/users/${ava.user.id}/follow`).expect(200)
    timeline = await mina.agent.get('/timeline').expect(200)
    expect(timeline.body.items.map((post: { body: string }) => post.body).sort()).toEqual(
      ['Hidden until followed', 'My own post', 'Visible after following'].sort(),
    )
  })

  it('creates replies as posts and increments the parent reply count', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')
    const parent = await createPost(mina.agent, 'Parent post')

    const reply = await mina.agent
      .post('/posts')
      .send({ body: 'A real reply', parentId: parent.id })
      .expect(201)

    const timeline = await mina.agent.get('/timeline').expect(200)
    const refreshedParent = timeline.body.items.find(
      (post: { id: string }) => post.id === parent.id,
    )

    expect(reply.body.post.parentId).toBe(parent.id)
    expect(refreshedParent.replyCount).toBe(1)
    expect(timeline.body.items.map((post: { body: string }) => post.body)).not.toContain(
      'A real reply',
    )
  })

  it('likes and unlikes a post without duplicate likes', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')
    const leo = await registerAgent('leo', 'Leo Park')
    const post = await createPost(leo.agent, 'A likeable post')

    await mina.agent.post(`/posts/${post.id}/like`).expect(200)
    const duplicate = await mina.agent.post(`/posts/${post.id}/like`).expect(200)
    expect(duplicate.body.post.likeCount).toBe(1)
    expect(duplicate.body.post.likedByMe).toBe(true)

    const unlike = await mina.agent.delete(`/posts/${post.id}/like`).expect(200)
    expect(unlike.body.post.likeCount).toBe(0)
    expect(unlike.body.post.likedByMe).toBe(false)

    const missingLike = await mina.agent.post(`/posts/${missingId}/like`).expect(404)
    const missingUnlike = await mina.agent.delete(`/posts/${missingId}/like`).expect(404)
    expect(errorCode(missingLike)).toBe('post_not_found')
    expect(errorCode(missingUnlike)).toBe('post_not_found')
  })

  it('returns a stable cursor for following timeline pagination', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')

    for (let index = 0; index < 25; index += 1) {
      await createPost(mina.agent, `Post ${String(index).padStart(2, '0')}`)
    }

    const firstPage = await mina.agent.get('/timeline').expect(200)
    expect(firstPage.body.items).toHaveLength(20)
    expect(firstPage.body.nextCursor).toEqual(expect.any(String))

    const secondPage = await mina.agent
      .get(`/timeline?cursor=${firstPage.body.nextCursor}`)
      .expect(200)
    const malformed = await mina.agent.get('/timeline?cursor=not-base64-json').expect(200)
    const seenBodies = [
      ...firstPage.body.items.map((post: { body: string }) => post.body),
      ...secondPage.body.items.map((post: { body: string }) => post.body),
    ]

    expect(secondPage.body.items).toHaveLength(5)
    expect(new Set(seenBodies)).toHaveLength(25)
    expect(malformed.body.items).toHaveLength(20)
  })
})

describe('profiles and follows', () => {
  it('returns profile stats and user posts for public profiles', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')
    const leo = await registerAgent('leo', 'Leo Park')

    await mina.agent.post(`/users/${leo.user.id}/follow`).expect(200)
    await createPost(leo.agent, 'Leo profile post')

    const profile = await mina.agent.get('/users/leo').expect(200)
    const posts = await mina.agent.get('/users/leo/posts').expect(200)

    expect(profile.body.user).toMatchObject({
      handle: 'leo',
      displayName: 'Leo Park',
      followerCount: 1,
      followingCount: 0,
      followedByMe: true,
    })
    expect(posts.body.user.handle).toBe('leo')
    expect(posts.body.items.map((post: { body: string }) => post.body)).toEqual([
      'Leo profile post',
    ])
  })

  it('follows and unfollows users while updating profile state and timeline scope', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')
    const leo = await registerAgent('leo', 'Leo Park')
    await createPost(leo.agent, 'Only visible while followed')

    await mina.agent.post(`/users/${leo.user.id}/follow`).expect(200)
    let timeline = await mina.agent.get('/timeline').expect(200)
    expect(timeline.body.items.map((post: { body: string }) => post.body)).toContain(
      'Only visible while followed',
    )

    const unfollow = await mina.agent.delete(`/users/${leo.user.id}/follow`).expect(200)
    timeline = await mina.agent.get('/timeline').expect(200)

    expect(unfollow.body.user.followedByMe).toBe(false)
    expect(timeline.body.items.map((post: { body: string }) => post.body)).not.toContain(
      'Only visible while followed',
    )
  })

  it('rejects self-follow and missing users', async () => {
    const mina = await registerAgent('mina', 'Mina Chen')

    const selfFollow = await mina.agent.post(`/users/${mina.user.id}/follow`).expect(400)
    const missingFollow = await mina.agent.post(`/users/${missingId}/follow`).expect(404)
    const missingUnfollow = await mina.agent.delete(`/users/${missingId}/follow`).expect(404)
    const missingProfile = await mina.agent.get('/users/nobody').expect(404)
    const missingPosts = await mina.agent.get('/users/nobody/posts').expect(404)

    expect(errorCode(selfFollow)).toBe('self_follow_not_allowed')
    expect(errorCode(missingFollow)).toBe('user_not_found')
    expect(errorCode(missingUnfollow)).toBe('user_not_found')
    expect(errorCode(missingProfile)).toBe('user_not_found')
    expect(errorCode(missingPosts)).toBe('user_not_found')
  })

  it('paginates public profile posts independently from the home timeline', async () => {
    const leo = await registerAgent('leo', 'Leo Park')

    for (let index = 0; index < 22; index += 1) {
      await createPost(leo.agent, `Leo Post ${String(index).padStart(2, '0')}`)
    }

    const firstPage = await request(testApp.app).get('/users/leo/posts').expect(200)
    const secondPage = await request(testApp.app)
      .get(`/users/leo/posts?cursor=${firstPage.body.nextCursor}`)
      .expect(200)

    expect(firstPage.body.items).toHaveLength(20)
    expect(firstPage.body.nextCursor).toEqual(expect.any(String))
    expect(secondPage.body.items).toHaveLength(2)
    expect(secondPage.body.user.handle).toBe('leo')
  })
})
