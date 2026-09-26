import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostView, TimelineResponse, UserPostsResponse, UserView } from '@trumpet/shared'
import { App } from './App.js'

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    timeline: vi.fn(),
    createPost: vi.fn(),
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    user: vi.fn(),
    userPosts: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  },
}))

vi.mock('./lib/api.js', () => ({ api: apiMock }))

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
  bio: '',
  createdAt: '2026-06-16T12:00:00.000Z',
  followerCount: 1,
  followingCount: 0,
  followedByMe: true,
}

const postFixture = (overrides: Partial<PostView> = {}): PostView => ({
  id: 'post-1',
  body: 'Existing timeline post',
  parentId: null,
  author: leo,
  likeCount: 0,
  replyCount: 0,
  likedByMe: false,
  createdAt: '2026-06-16T12:30:00.000Z',
  ...overrides,
})

const timelineFixture = (
  items: PostView[],
  nextCursor: string | null = null,
): TimelineResponse => ({ items, nextCursor })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('App', () => {
  it('logs in and loads the following timeline', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValueOnce({ user: null }).mockResolvedValueOnce({ user: mina })
    apiMock.login.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([postFixture()]))

    render(<App />)
    expect(
      await screen.findByRole('heading', { name: '用一个小号 Twitter 练完整全栈闭环' }),
    ).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: '登录' }).at(-1)!)
    expect(await screen.findByRole('heading', { name: 'Following' })).toBeInTheDocument()
    expect(screen.getByText('Existing timeline post')).toBeInTheDocument()
  })

  it('creates a post and likes an existing timeline post', async () => {
    const user = userEvent.setup()
    const base = postFixture()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([base]))
    apiMock.createPost.mockResolvedValue({
      post: postFixture({ id: 'post-new', body: 'Fresh post', author: mina }),
    })
    apiMock.likePost.mockResolvedValue({ post: postFixture({ likeCount: 1, likedByMe: true }) })

    render(<App />)
    const composer = await screen.findByPlaceholderText('What are you building?')
    await user.type(composer, 'Fresh post')
    await user.click(screen.getByRole('button', { name: /Post/ }))
    expect(await screen.findByText('Fresh post')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Like 0' })[0]!)
    expect(await screen.findByRole('button', { name: 'Like 1' })).toBeInTheDocument()
  })

  it('paginates the timeline and opens a profile follow toggle', async () => {
    const user = userEvent.setup()
    const unfollowed = { ...leo, followedByMe: false, followerCount: 0 }
    const followed = { ...leo, followedByMe: true, followerCount: 1 }

    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline
      .mockResolvedValueOnce(timelineFixture([postFixture({ body: 'First page' })], 'cursor-1'))
      .mockResolvedValueOnce(timelineFixture([postFixture({ id: 'post-2', body: 'Second page' })]))
    apiMock.userPosts.mockResolvedValue({
      user: unfollowed,
      items: [],
      nextCursor: null,
    } satisfies UserPostsResponse)
    apiMock.follow.mockResolvedValue({ user: followed })
    apiMock.unfollow.mockResolvedValue({ user: unfollowed })

    render(<App />)
    expect(await screen.findByText('First page')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '加载更多' }))
    expect(await screen.findByText('Second page')).toBeInTheDocument()

    const suggestion = await screen.findByText((_content, element) => {
      return (
        element?.tagName.toLowerCase() === 'small' &&
        element.textContent?.includes('API contracts and testing') === true
      )
    })
    await user.click(suggestion.closest('button')!)
    expect(await screen.findByRole('heading', { name: 'Leo Park' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Follow' }))
    expect(await screen.findByRole('button', { name: 'Unfollow' })).toBeInTheDocument()
  })
})
