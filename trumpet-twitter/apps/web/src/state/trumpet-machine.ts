import type { PostView, UserView } from '@trumpet/shared'

export type FeedView = { name: 'home' } | { name: 'profile'; handle: string }

export interface TrumpetState {
  user: UserView | null
  view: FeedView
  posts: PostView[]
  profilePosts: PostView[]
  profile: UserView | null
  nextCursor: string | null
  loading: boolean
  error: string | null
}

export type TrumpetEvent =
  | { type: 'boot-started' }
  | { type: 'session-ready'; user: UserView; posts: PostView[]; nextCursor: string | null }
  | { type: 'session-empty' }
  | { type: 'session-cleared' }
  | { type: 'timeline-replaced'; posts: PostView[]; nextCursor: string | null }
  | { type: 'timeline-appended'; posts: PostView[]; nextCursor: string | null }
  | { type: 'post-prepended'; post: PostView }
  | { type: 'posts-patched'; post: PostView | null }
  | { type: 'view-home' }
  | { type: 'profile-started'; handle: string }
  | { type: 'profile-loaded'; user: UserView; posts: PostView[] }
  | { type: 'profile-failed'; error: string }
  | { type: 'profile-updated'; user: UserView }
  | { type: 'loading-changed'; loading: boolean }
  | { type: 'error-reported'; error: string | null }

type TransitionMap = {
  [E in TrumpetEvent as E['type']]: (state: TrumpetState, event: E) => TrumpetState
}

export const initialTrumpetState: TrumpetState = {
  user: null,
  view: { name: 'home' },
  posts: [],
  profilePosts: [],
  profile: null,
  nextCursor: null,
  loading: true,
  error: null,
}

const replacePost = (items: PostView[], next: PostView | null) =>
  next ? items.map((item) => (item.id === next.id ? next : item)) : items

const transitions: TransitionMap = {
  'boot-started': (state) => ({ ...state, loading: true, error: null }),

  'session-ready': (state, event) => ({
    ...state,
    user: event.user,
    posts: event.posts,
    nextCursor: event.nextCursor,
  }),

  'session-empty': (state) => ({ ...state, user: null }),

  'session-cleared': (state) => ({
    ...state,
    user: null,
    posts: [],
    profilePosts: [],
    view: { name: 'home' },
  }),

  'timeline-replaced': (state, event) => ({
    ...state,
    posts: event.posts,
    nextCursor: event.nextCursor,
  }),

  'timeline-appended': (state, event) => ({
    ...state,
    posts: [...state.posts, ...event.posts],
    nextCursor: event.nextCursor,
  }),

  'post-prepended': (state, event) => ({
    ...state,
    posts: [event.post, ...state.posts],
  }),

  'posts-patched': (state, event) => ({
    ...state,
    posts: replacePost(state.posts, event.post),
    profilePosts: replacePost(state.profilePosts, event.post),
  }),

  'view-home': (state) => ({ ...state, view: { name: 'home' } }),

  'profile-started': (state, event) => ({
    ...state,
    view: { name: 'profile', handle: event.handle },
    loading: true,
    error: null,
  }),

  'profile-loaded': (state, event) => ({
    ...state,
    profile: event.user,
    profilePosts: event.posts,
  }),

  'profile-failed': (state, event) => ({
    ...state,
    profile: null,
    profilePosts: [],
    error: event.error,
  }),

  'profile-updated': (state, event) => ({ ...state, profile: event.user }),

  'loading-changed': (state, event) => ({ ...state, loading: event.loading }),

  'error-reported': (state, event) => ({ ...state, error: event.error }),
}

export const reduceTrumpet = (state: TrumpetState, event: TrumpetEvent): TrumpetState => {
  switch (event.type) {
    case 'boot-started':
      return transitions['boot-started'](state, event)
    case 'session-ready':
      return transitions['session-ready'](state, event)
    case 'session-empty':
      return transitions['session-empty'](state, event)
    case 'session-cleared':
      return transitions['session-cleared'](state, event)
    case 'timeline-replaced':
      return transitions['timeline-replaced'](state, event)
    case 'timeline-appended':
      return transitions['timeline-appended'](state, event)
    case 'post-prepended':
      return transitions['post-prepended'](state, event)
    case 'posts-patched':
      return transitions['posts-patched'](state, event)
    case 'view-home':
      return transitions['view-home'](state, event)
    case 'profile-started':
      return transitions['profile-started'](state, event)
    case 'profile-loaded':
      return transitions['profile-loaded'](state, event)
    case 'profile-failed':
      return transitions['profile-failed'](state, event)
    case 'profile-updated':
      return transitions['profile-updated'](state, event)
    case 'loading-changed':
      return transitions['loading-changed'](state, event)
    case 'error-reported':
      return transitions['error-reported'](state, event)
    default: {
      const unexpected: never = event
      return unexpected
    }
  }
}
