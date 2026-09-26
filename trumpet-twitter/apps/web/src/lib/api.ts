import type {
  AuthResponse,
  CreatePostBody,
  MeResponse,
  PostView,
  TimelineResponse,
  UserPostsResponse,
  UserView,
} from '@trumpet/shared'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(payload?.error?.message ?? '请求失败')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  register: (input: { handle: string; displayName: string; password: string }) => {
    return requestJson<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  login: (input: { handle: string; password: string }) => {
    return requestJson<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  logout: () => requestJson<void>('/auth/logout', { method: 'POST' }),

  me: () => requestJson<MeResponse>('/me'),

  timeline: (cursor?: string | null) => {
    const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    return requestJson<TimelineResponse>(`/timeline${suffix}`)
  },

  createPost: (input: CreatePostBody) => {
    return requestJson<{ post: PostView }>('/posts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  likePost: (id: string) =>
    requestJson<{ post: PostView }>(`/posts/${id}/like`, { method: 'POST' }),

  unlikePost: (id: string) =>
    requestJson<{ post: PostView }>(`/posts/${id}/like`, { method: 'DELETE' }),

  user: (handle: string) => requestJson<{ user: UserView }>(`/users/${handle}`),

  userPosts: (handle: string, cursor?: string | null) => {
    const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    return requestJson<UserPostsResponse>(`/users/${handle}/posts${suffix}`)
  },

  follow: (id: string) =>
    requestJson<{ user: UserView }>(`/users/${id}/follow`, { method: 'POST' }),

  unfollow: (id: string) =>
    requestJson<{ user: UserView }>(`/users/${id}/follow`, { method: 'DELETE' }),
}
