import { z } from 'zod'

export const handleSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/)
  .transform((handle) => handle.toLowerCase())

export const registerBodySchema = z.object({
  handle: handleSchema,
  displayName: z.string().min(1).max(80),
  password: z.string().min(8).max(120),
})

export const loginBodySchema = z.object({
  handle: handleSchema,
  password: z.string().min(8).max(120),
})

export const createPostBodySchema = z.object({
  body: z.string().trim().min(1).max(280),
  parentId: z.uuid().nullable().optional(),
})

export const followParamsSchema = z.object({
  id: z.uuid(),
})

export const userParamsSchema = z.object({
  handle: handleSchema,
})

export const postParamsSchema = z.object({
  id: z.uuid(),
})

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type CreatePostBody = z.infer<typeof createPostBodySchema>

export interface UserView {
  id: string
  handle: string
  displayName: string
  bio: string
  createdAt: string
  followedByMe?: boolean
  followerCount?: number
  followingCount?: number
}

export interface PostView {
  id: string
  body: string
  parentId: string | null
  author: UserView
  likeCount: number
  replyCount: number
  likedByMe: boolean
  createdAt: string
}

export interface AuthResponse {
  user: UserView
}

export interface MeResponse {
  user: UserView | null
}

export interface TimelineResponse {
  items: PostView[]
  nextCursor: string | null
}

export interface UserPostsResponse {
  user: UserView
  items: PostView[]
  nextCursor: string | null
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}
