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

const cursorPath = (path: string, cursor?: string | null) =>
  cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path

const getJson = <T>(path: string) => requestJson<T>(path)

const postJson = <T>(path: string, body?: unknown) =>
  requestJson<T>(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const deleteJson = <T>(path: string) => requestJson<T>(path, { method: 'DELETE' })

export const api = {
  register: (input: { handle: string; displayName: string; password: string }) =>
    postJson<AuthResponse>('/auth/register', input),

  login: (input: { handle: string; password: string }) =>
    postJson<AuthResponse>('/auth/login', input),

  logout: () => postJson<void>('/auth/logout'),

  me: () => getJson<MeResponse>('/me'),

  timeline: (cursor?: string | null) => getJson<TimelineResponse>(cursorPath('/timeline', cursor)),

  createPost: (input: CreatePostBody) => postJson<{ post: PostView }>('/posts', input),

  likePost: (id: string) => postJson<{ post: PostView }>(`/posts/${id}/like`),

  unlikePost: (id: string) => deleteJson<{ post: PostView }>(`/posts/${id}/like`),

  user: (handle: string) => getJson<{ user: UserView }>(`/users/${handle}`),

  userPosts: (handle: string, cursor?: string | null) =>
    getJson<UserPostsResponse>(cursorPath(`/users/${handle}/posts`, cursor)),

  follow: (id: string) => postJson<{ user: UserView }>(`/users/${id}/follow`),

  unfollow: (id: string) => deleteJson<{ user: UserView }>(`/users/${id}/follow`),
}
