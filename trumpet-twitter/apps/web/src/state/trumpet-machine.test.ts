import { describe, expect, it } from 'vitest'
import type { PostView, UserView } from '@trumpet/shared'
import {
  initialTrumpetState,
  reduceTrumpet,
  type TrumpetEvent,
  type TrumpetState,
} from './trumpet-machine.js'

const mina: UserView = {
  id: 'user-mina',
  handle: 'mina',
  displayName: 'Mina Chen',
  bio: '',
  createdAt: '2026-06-16T12:00:00.000Z',
}

const leo: UserView = {
  id: 'user-leo',
  handle: 'leo',
  displayName: 'Leo Park',
  bio: 'API contracts',
  createdAt: '2026-06-16T12:00:00.000Z',
  followerCount: 0,
  followingCount: 0,
  followedByMe: false,
}

const post = (id: string, overrides: Partial<PostView> = {}): PostView => ({
  id,
  body: id,
  parentId: null,
  author: leo,
  likeCount: 0,
  replyCount: 0,
  likedByMe: false,
  createdAt: '2026-06-16T12:30:00.000Z',
  ...overrides,
})

const reduce = (events: TrumpetEvent[], state: TrumpetState = initialTrumpetState) =>
  events.reduce(reduceTrumpet, state)

describe('reduceTrumpet', () => {
  it('starts on a loading home screen with no session', () => {
    expect(initialTrumpetState).toMatchObject({
      user: null,
      view: { name: 'home' },
      posts: [],
      profile: null,
      loading: true,
      error: null,
    })
  })

  it('boots into a signed-in timeline and can return to signed-out', () => {
    const ready = reduce([
      { type: 'boot-started' },
      {
        type: 'session-ready',
        user: mina,
        posts: [post('post-1')],
        nextCursor: 'cursor-1',
      },
      { type: 'loading-changed', loading: false },
    ])

    expect(ready).toMatchObject({
      user: mina,
      posts: [post('post-1')],
      nextCursor: 'cursor-1',
      loading: false,
      error: null,
      view: { name: 'home' },
    })

    expect(reduce([{ type: 'session-empty' }], ready).user).toBeNull()
    expect(reduce([{ type: 'session-cleared' }], ready)).toMatchObject({
      user: null,
      posts: [],
      profilePosts: [],
      view: { name: 'home' },
    })
  })

  it('prepends, appends, replaces, and patches posts in both feeds', () => {
    const first = post('post-1')
    const liked = post('post-1', { likedByMe: true, likeCount: 1 })
    const state = reduce([
      { type: 'timeline-replaced', posts: [first], nextCursor: 'cursor-1' },
      { type: 'profile-loaded', user: leo, posts: [first] },
      { type: 'post-prepended', post: post('post-new') },
      { type: 'timeline-appended', posts: [post('post-2')], nextCursor: null },
      { type: 'posts-patched', post: liked },
    ])

    expect(state.posts.map((item) => item.id)).toEqual(['post-new', 'post-1', 'post-2'])
    expect(state.nextCursor).toBeNull()
    expect(state.posts[1]).toMatchObject({ likedByMe: true, likeCount: 1 })
    expect(state.profilePosts[0]).toMatchObject({ likedByMe: true, likeCount: 1 })
    expect(reduce([{ type: 'posts-patched', post: null }], state).posts).toBe(state.posts)
  })

  it('opens a profile without dropping the previous one until load settles', () => {
    const opened = reduce([
      { type: 'profile-loaded', user: leo, posts: [post('post-1')] },
      { type: 'error-reported', error: '旧错误' },
      { type: 'profile-started', handle: 'ava' },
    ])

    expect(opened.view).toEqual({ name: 'profile', handle: 'ava' })
    expect(opened.profile).toEqual(leo)
    expect(opened.loading).toBe(true)
    expect(opened.error).toBeNull()

    const failed = reduce([{ type: 'profile-failed', error: '用户不存在' }], opened)
    expect(failed.profile).toBeNull()
    expect(failed.profilePosts).toEqual([])
    expect(failed.error).toBe('用户不存在')

    const loaded = reduce(
      [
        { type: 'profile-loaded', user: { ...leo, handle: 'ava' }, posts: [] },
        { type: 'loading-changed', loading: false },
        { type: 'profile-updated', user: { ...leo, handle: 'ava', followedByMe: true } },
      ],
      opened,
    )
    expect(loaded.profile).toMatchObject({ handle: 'ava', followedByMe: true })
    expect(loaded.loading).toBe(false)
    expect(reduce([{ type: 'view-home' }], loaded).view).toEqual({ name: 'home' })
    expect(reduce([{ type: 'view-home' }], loaded).posts).toEqual(loaded.posts)
  })

  it('keeps the current view when a later boot replaces the timeline', () => {
    const state = reduce([
      { type: 'profile-started', handle: 'leo' },
      { type: 'session-ready', user: mina, posts: [post('post-1')], nextCursor: null },
    ])

    expect(state.view).toEqual({ name: 'profile', handle: 'leo' })
    expect(state.user).toEqual(mina)
  })
})
