import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.js'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function response(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => body),
  }
}

describe('api client', () => {
  it('sends credentials and JSON headers for login', async () => {
    fetchMock.mockResolvedValue(response(200, { user: { handle: 'mina' } }))

    const result = await api.login({ handle: 'mina', password: 'password123' })

    expect(result.user.handle).toBe('mina')
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/auth/login', {
      method: 'POST',
      body: JSON.stringify({ handle: 'mina', password: 'password123' }),
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  it('encodes timeline cursors and omits the query when the cursor is empty', async () => {
    fetchMock.mockResolvedValue(response(200, { items: [], nextCursor: null }))

    await api.timeline('cursor with spaces')
    await api.timeline()
    await api.timeline(null)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/timeline?cursor=cursor%20with%20spaces',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/timeline',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:4000/timeline',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns undefined for empty logout responses', async () => {
    fetchMock.mockResolvedValue(response(204))

    await expect(api.logout()).resolves.toBeUndefined()
  })

  it('throws server-provided error messages and a fallback for non-JSON bodies', async () => {
    fetchMock
      .mockResolvedValueOnce(response(400, { error: { message: '请求格式不正确' } }))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn(async () => {
          throw new Error('not json')
        }),
      })

    await expect(api.createPost({ body: '' })).rejects.toThrow('请求格式不正确')
    await expect(api.me()).rejects.toThrow('请求失败')
  })

  it('sends root posts and replies through the same create endpoint', async () => {
    fetchMock.mockResolvedValue(response(201, { post: { id: 'post-1' } }))

    await api.createPost({ body: 'hello', parentId: '7cb2c370-ad6b-4385-9b68-d0c5f30580c9' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/posts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          body: 'hello',
          parentId: '7cb2c370-ad6b-4385-9b68-d0c5f30580c9',
        }),
      }),
    )
  })

  it('registers and reads a user profile', async () => {
    fetchMock
      .mockResolvedValueOnce(response(201, { user: { handle: 'newuser' } }))
      .mockResolvedValueOnce(response(200, { user: { handle: 'leo' } }))

    await api.register({ handle: 'newuser', displayName: 'New User', password: 'password123' })
    await api.user('leo')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/auth/register',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/users/leo',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('likes, unlikes, follows, and unfollows with the matching verbs', async () => {
    fetchMock.mockResolvedValue(response(200, { post: { id: 'post-1' }, user: { id: 'user-leo' } }))

    await api.likePost('post-1')
    await api.unlikePost('post-1')
    await api.follow('user-leo')
    await api.unfollow('user-leo')
    await api.userPosts('leo', 'cursor with spaces')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/posts/post-1/like',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/posts/post-1/like',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/users/user-leo/follow',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/users/user-leo/follow',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/users/leo/posts?cursor=cursor%20with%20spaces',
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})
