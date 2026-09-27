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

const userPostsFixture = (user: UserView, items: PostView[]): UserPostsResponse => ({
  user,
  items,
  nextCursor: null,
})

const openLeoSuggestion = async (user: ReturnType<typeof userEvent.setup>) => {
  const suggestion = await screen.findByText((_content, element) => {
    return (
      element?.tagName.toLowerCase() === 'small' &&
      element.textContent?.includes('API contracts and testing') === true
    )
  })
  const button = suggestion.closest('button')
  expect(button).not.toBeNull()
  await user.click(button!)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('App authentication', () => {
  it('renders the login form and loads the timeline after login', async () => {
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
    expect(apiMock.login).toHaveBeenCalledWith({ handle: 'mina', password: 'password123' })
  })

  it('shows authentication errors without leaving the login screen', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: null })
    apiMock.login.mockRejectedValue(new Error('账号或密码不正确'))

    render(<App />)
    await screen.findByRole('heading', { name: '用一个小号 Twitter 练完整全栈闭环' })
    await user.click(screen.getAllByRole('button', { name: '登录' }).at(-1)!)

    expect(await screen.findByText('账号或密码不正确')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Following' })).not.toBeInTheDocument()
  })

  it('keeps the authenticated shell when the timeline fails after /me succeeds', async () => {
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockRejectedValue(new Error('时间线不可用'))

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Following' })).toBeInTheDocument()
    expect(await screen.findByText('时间线不可用')).toBeInTheDocument()
    expect(screen.getByText('时间线不可用')).toHaveClass('error-banner')
    expect(
      screen.queryByRole('heading', { name: '用一个小号 Twitter 练完整全栈闭环' }),
    ).not.toBeInTheDocument()
  })

  it('registers a new account and then boots the authenticated timeline', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValueOnce({ user: null }).mockResolvedValueOnce({ user: mina })
    apiMock.register.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([]))

    render(<App />)
    await screen.findByRole('heading', { name: '用一个小号 Twitter 练完整全栈闭环' })
    await user.click(screen.getByRole('button', { name: '注册' }))
    await user.clear(screen.getByLabelText('Handle'))
    await user.type(screen.getByLabelText('Handle'), 'newuser')
    await user.clear(screen.getByLabelText('显示名'))
    await user.type(screen.getByLabelText('显示名'), 'New User')
    await user.click(screen.getByRole('button', { name: '创建账号' }))

    expect(apiMock.register).toHaveBeenCalledWith({
      handle: 'newuser',
      displayName: 'New User',
      password: 'password123',
    })
    expect(await screen.findByRole('heading', { name: 'Following' })).toBeInTheDocument()
  })

  it('logs out and returns to the auth form', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([]))
    apiMock.logout.mockResolvedValue(undefined)

    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Following' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '退出登录' }))

    expect(
      await screen.findByRole('heading', { name: '用一个小号 Twitter 练完整全栈闭环' }),
    ).toBeInTheDocument()
    expect(apiMock.logout).toHaveBeenCalledTimes(1)
  })
})

describe('App timeline interactions', () => {
  it('does not create a post for an empty composer', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([]))

    render(<App />)
    await screen.findByRole('heading', { name: 'Following' })
    const button = screen.getByRole('button', { name: /Post/ })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(apiMock.createPost).not.toHaveBeenCalled()
  })

  it('creates a post and prepends it to the timeline', async () => {
    const user = userEvent.setup()
    const newPost = postFixture({
      id: 'post-new',
      body: 'A new post from the composer',
      author: mina,
    })
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([postFixture()]))
    apiMock.createPost.mockResolvedValue({ post: newPost })

    render(<App />)
    const composer = await screen.findByPlaceholderText('What are you building?')
    await user.type(composer, 'A new post from the composer')
    await user.click(screen.getByRole('button', { name: /Post/ }))

    expect(apiMock.createPost).toHaveBeenCalledWith({ body: 'A new post from the composer' })
    expect(await screen.findByText('A new post from the composer')).toBeInTheDocument()
    expect(composer).toHaveValue('')
  })

  it('surfaces an error banner with the fallback message when a post fails', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([]))
    apiMock.createPost.mockRejectedValue('network down')

    render(<App />)
    const composer = await screen.findByPlaceholderText('What are you building?')
    await user.type(composer, 'This post will fail')
    await user.click(screen.getByRole('button', { name: /Post/ }))

    expect(await screen.findByText('发帖失败')).toBeInTheDocument()
    expect(screen.getByText('发帖失败')).toHaveClass('error-banner')
    expect(composer).toHaveValue('This post will fail')
  })

  it('likes and unlikes timeline posts in place', async () => {
    const user = userEvent.setup()
    const basePost = postFixture()
    const likedPost = postFixture({ likeCount: 1, likedByMe: true })
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([basePost]))
    apiMock.likePost.mockResolvedValue({ post: likedPost })
    apiMock.unlikePost.mockResolvedValue({ post: basePost })

    render(<App />)
    await screen.findByText('Existing timeline post')
    await user.click(screen.getByRole('button', { name: 'Like 0' }))
    expect(await screen.findByRole('button', { name: 'Like 1' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Like 1' }))
    expect(await screen.findByRole('button', { name: 'Like 0' })).toBeInTheDocument()
    expect(apiMock.likePost).toHaveBeenCalledWith('post-1')
    expect(apiMock.unlikePost).toHaveBeenCalledWith('post-1')
  })

  it('creates replies and refreshes the timeline reply count', async () => {
    const user = userEvent.setup()
    const basePost = postFixture()
    const repliedPost = postFixture({ replyCount: 1 })
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline
      .mockResolvedValueOnce(timelineFixture([basePost]))
      .mockResolvedValueOnce(timelineFixture([repliedPost]))
    apiMock.createPost.mockResolvedValue({
      post: postFixture({ id: 'reply-1', parentId: 'post-1', body: 'Reply body' }),
    })

    render(<App />)
    await screen.findByText('Existing timeline post')
    await user.click(screen.getByRole('button', { name: 'Reply 0' }))
    await user.type(screen.getByPlaceholderText('回复 @leo'), 'Reply body')
    await user.click(screen.getByRole('button', { name: /Reply$/ }))

    expect(apiMock.createPost).toHaveBeenCalledWith({ body: 'Reply body', parentId: 'post-1' })
    expect(await screen.findByRole('button', { name: 'Reply 1' })).toBeInTheDocument()
  })

  it('does not submit an empty reply', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([postFixture()]))

    render(<App />)
    await screen.findByText('Existing timeline post')
    await user.click(screen.getByRole('button', { name: 'Reply 0' }))

    expect(screen.getByRole('button', { name: /Reply$/ })).toBeDisabled()
    expect(apiMock.createPost).not.toHaveBeenCalled()
  })

  it('loads another page when a timeline cursor is present', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline
      .mockResolvedValueOnce(
        timelineFixture([postFixture({ id: 'post-1', body: 'First page' })], 'cursor-1'),
      )
      .mockResolvedValueOnce(timelineFixture([postFixture({ id: 'post-2', body: 'Second page' })]))

    render(<App />)
    expect(await screen.findByText('First page')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '加载更多' }))
    expect(await screen.findByText('Second page')).toBeInTheDocument()
    expect(apiMock.timeline).toHaveBeenLastCalledWith('cursor-1')
  })
})

describe('App profile interactions', () => {
  it('opens a profile and follows the visible user', async () => {
    const user = userEvent.setup()
    const unfollowedLeo = { ...leo, followedByMe: false, followerCount: 0 }
    const followedLeo = { ...leo, followedByMe: true, followerCount: 1 }
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([]))
    apiMock.userPosts.mockResolvedValue(userPostsFixture(unfollowedLeo, []))
    apiMock.follow.mockResolvedValue({ user: followedLeo })

    render(<App />)
    await openLeoSuggestion(user)
    expect(await screen.findByRole('heading', { name: 'Leo Park' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Follow' }))
    expect(await screen.findByRole('button', { name: 'Unfollow' })).toBeInTheDocument()
    expect(apiMock.follow).toHaveBeenCalledWith('user-leo')
  })

  it('opens a profile and unfollows the visible user', async () => {
    const user = userEvent.setup()
    const leoPost = postFixture()
    const unfollowedLeo = { ...leo, followedByMe: false, followerCount: 0 }
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([leoPost]))
    apiMock.userPosts.mockResolvedValue(userPostsFixture(leo, [leoPost]))
    apiMock.unfollow.mockResolvedValue({ user: unfollowedLeo })

    render(<App />)
    await openLeoSuggestion(user)
    expect(await screen.findByRole('heading', { name: 'Leo Park' })).toBeInTheDocument()
    expect(screen.getByText('Existing timeline post')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unfollow' }))
    expect(await screen.findByRole('button', { name: 'Follow' })).toBeInTheDocument()
    expect(apiMock.unfollow).toHaveBeenCalledWith('user-leo')
  })

  it('returns home from a profile without clearing the timeline', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(
      timelineFixture([postFixture({ body: 'Still on the timeline' })]),
    )
    apiMock.userPosts.mockResolvedValue(userPostsFixture(leo, []))

    render(<App />)
    await openLeoSuggestion(user)
    expect(await screen.findByRole('heading', { name: 'Leo Park' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回' }))

    expect(await screen.findByRole('heading', { name: 'Following' })).toBeInTheDocument()
    expect(screen.getByText('Still on the timeline')).toBeInTheDocument()
  })

  it('shows profile loading errors when user lookup fails', async () => {
    const user = userEvent.setup()
    apiMock.me.mockResolvedValue({ user: mina })
    apiMock.timeline.mockResolvedValue(timelineFixture([]))
    apiMock.userPosts.mockRejectedValue(new Error('用户不存在'))

    render(<App />)
    await openLeoSuggestion(user)
    expect((await screen.findAllByText('用户不存在')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('用户不存在')[0]).toHaveClass('error-banner')
  })
})
