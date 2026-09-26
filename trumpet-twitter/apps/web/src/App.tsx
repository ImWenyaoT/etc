import { useEffect, useState } from 'react'
import type { PostView, UserView } from '@trumpet/shared'
import { AuthForm } from './components/AuthForm.js'
import { Composer } from './components/Composer.js'
import { PostCard } from './components/PostCard.js'
import { RightPanel } from './components/RightPanel.js'
import { Sidebar } from './components/Sidebar.js'
import { api } from './lib/api.js'

type View = { name: 'home' } | { name: 'profile'; handle: string }

const replacePost = (items: PostView[], next: PostView | null) =>
  next ? items.map((item) => (item.id === next.id ? next : item)) : items

const errMsg = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback

export const App = () => {
  const [currentUser, setCurrentUser] = useState<UserView | null>(null)
  const [view, setView] = useState<View>({ name: 'home' })
  const [posts, setPosts] = useState<PostView[]>([])
  const [profilePosts, setProfilePosts] = useState<PostView[]>([])
  const [profile, setProfile] = useState<UserView | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [composerValue, setComposerValue] = useState('')
  const [replyValues, setReplyValues] = useState<Record<string, string>>({})
  const [openReplyId, setOpenReplyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const report = (cause: unknown, fallback: string) => setError(errMsg(cause, fallback))

  const boot = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const me = await api.me()
      setCurrentUser(me.user)
      if (me.user) {
        const timeline = await api.timeline()
        setPosts(timeline.items)
        setNextCursor(timeline.nextCursor)
      }
    } catch (cause) {
      report(cause, '启动失败')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTimeline = async () => {
    const timeline = await api.timeline()
    setPosts(timeline.items)
    setNextCursor(timeline.nextCursor)
  }

  const openProfile = async (handle: string) => {
    setView({ name: 'profile', handle })
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.userPosts(handle)
      setProfile(response.user)
      setProfilePosts(response.items)
    } catch (cause) {
      report(cause, '用户加载失败')
      setProfile(null)
      setProfilePosts([])
    } finally {
      setIsLoading(false)
    }
  }

  const createRootPost = async () => {
    if (!composerValue.trim()) return
    try {
      setError(null)
      const response = await api.createPost({ body: composerValue })
      setComposerValue('')
      setPosts((current) => [response.post, ...current])
    } catch (cause) {
      report(cause, '发帖失败')
    }
  }

  const createReply = async (postId: string) => {
    const body = replyValues[postId]?.trim()
    if (!body) return
    try {
      setError(null)
      await api.createPost({ body, parentId: postId })
      setReplyValues((current) => ({ ...current, [postId]: '' }))
      setOpenReplyId(null)
      await refreshTimeline()
    } catch (cause) {
      report(cause, '回复失败')
    }
  }

  const toggleLike = async (post: PostView) => {
    try {
      setError(null)
      const response = post.likedByMe ? await api.unlikePost(post.id) : await api.likePost(post.id)
      setPosts((current) => replacePost(current, response.post))
      setProfilePosts((current) => replacePost(current, response.post))
    } catch (cause) {
      report(cause, '操作失败')
    }
  }

  const loadMore = async () => {
    if (!nextCursor) return
    setIsLoading(true)
    try {
      setError(null)
      const timeline = await api.timeline(nextCursor)
      setPosts((current) => [...current, ...timeline.items])
      setNextCursor(timeline.nextCursor)
    } catch (cause) {
      report(cause, '加载更多失败')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFollow = async (user: UserView) => {
    try {
      setError(null)
      const response = user.followedByMe ? await api.unfollow(user.id) : await api.follow(user.id)
      setProfile(response.user)
      await refreshTimeline()
    } catch (cause) {
      report(cause, '关注操作失败')
    }
  }

  const logout = async () => {
    await api.logout()
    setCurrentUser(null)
    setPosts([])
    setProfilePosts([])
    setView({ name: 'home' })
  }

  useEffect(() => {
    void boot()
  }, [])

  if (isLoading && !currentUser) {
    return <div className="loading-screen">Loading Trumpet...</div>
  }

  if (!currentUser) {
    return <AuthForm onAuthenticated={() => void boot()} />
  }

  const cardProps = {
    onOpenProfile: (handle: string) => void openProfile(handle),
    onLike: (post: PostView) => void toggleLike(post),
  }

  return (
    <main className="app-shell">
      <Sidebar
        user={currentUser}
        onHome={() => setView({ name: 'home' })}
        onProfile={() => void openProfile(currentUser.handle)}
        onLogout={() => void logout()}
      />

      <div className="content-column">
        {error ? <p className="error-banner">{error}</p> : null}

        {view.name === 'home' ? (
          <section className="feed">
            <header className="feed-header">
              <h1>Following</h1>
              <p>自己和已关注用户的文本时间线</p>
            </header>
            <Composer
              value={composerValue}
              onChange={setComposerValue}
              onSubmit={() => void createRootPost()}
            />
            <div className="post-list">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  replyValue={replyValues[post.id] ?? ''}
                  isReplying={openReplyId === post.id}
                  onToggleReply={(postId) =>
                    setOpenReplyId((current) => (current === postId ? null : postId))
                  }
                  onReplyValueChange={(postId, value) =>
                    setReplyValues((current) => ({ ...current, [postId]: value }))
                  }
                  onSubmitReply={(postId) => void createReply(postId)}
                  {...cardProps}
                />
              ))}
            </div>
            {posts.length === 0 && !isLoading ? (
              <div className="empty-state">
                <h2>时间线还很安静</h2>
                <p>先发一条帖子，或者去右侧打开 seed 用户主页再关注他们。</p>
              </div>
            ) : null}
            {nextCursor ? (
              <button
                className="load-more"
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoading}
              >
                {isLoading ? '加载中...' : '加载更多'}
              </button>
            ) : null}
          </section>
        ) : (
          <section className="feed">
            <header className="profile-hero">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setView({ name: 'home' })}
              >
                返回
              </button>
              {profile ? (
                <>
                  <div className="profile-avatar">
                    {profile.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h1>{profile.displayName}</h1>
                    <p>@{profile.handle}</p>
                    <p>{profile.bio || '这个用户还没有写简介。'}</p>
                  </div>
                  <div className="profile-stats">
                    <span>{profile.followerCount ?? 0} followers</span>
                    <span>{profile.followingCount ?? 0} following</span>
                  </div>
                  {currentUser.id !== profile.id ? (
                    <button
                      className="primary-button small"
                      type="button"
                      onClick={() => void toggleFollow(profile)}
                    >
                      {profile.followedByMe ? 'Unfollow' : 'Follow'}
                    </button>
                  ) : null}
                </>
              ) : (
                <p>{isLoading ? '加载中...' : '用户不存在'}</p>
              )}
            </header>
            <div className="post-list">
              {profilePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  replyValue=""
                  isReplying={false}
                  onToggleReply={() => undefined}
                  onReplyValueChange={() => undefined}
                  onSubmitReply={() => undefined}
                  {...cardProps}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <RightPanel user={currentUser} onOpenProfile={(handle) => void openProfile(handle)} />
    </main>
  )
}
