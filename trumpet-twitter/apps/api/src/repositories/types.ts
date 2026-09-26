import type { UserView } from '@trumpet/shared'

export interface StoredUser {
  id: string
  handle: string
  displayName: string
  bio: string
  passwordHash: string
  createdAt: string
}

export interface UserStats {
  followerCount: number
  followingCount: number
  followedByMe: boolean
}

export const toUserView = (user: StoredUser, stats?: Partial<UserStats>): UserView => ({
  id: user.id,
  handle: user.handle,
  displayName: user.displayName,
  bio: user.bio,
  createdAt: user.createdAt,
  ...(stats?.followedByMe === undefined ? {} : { followedByMe: stats.followedByMe }),
  ...(stats?.followerCount === undefined ? {} : { followerCount: stats.followerCount }),
  ...(stats?.followingCount === undefined ? {} : { followingCount: stats.followingCount }),
})
