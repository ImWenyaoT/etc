export interface User {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
}

export interface Post {
  id: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  author: User;
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
}

export interface Page {
  items: Post[];
  nextCursor: string | null;
}
