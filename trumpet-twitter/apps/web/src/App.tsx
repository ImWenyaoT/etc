import type { PostView, UserView } from '@trumpet/shared'
import { AuthForm } from './components/AuthForm.js'
import { Composer } from './components/Composer.js'
import { PostCard } from './components/PostCard.js'
import { RightPanel } from './components/RightPanel.js'
import { Sidebar } from './components/Sidebar.js'
import { useTrumpetApp } from './hooks/useTrumpetApp.js'
import type { FeedView } from './state/trumpet-machine.js'

const cardHandlers = (
  app: Pick<ReturnType<typeof useTrumpetApp>, 'openProfile' | 'toggleLike'>,
) => ({
  onOpenProfile: (handle: string) => void app.openProfile(handle),
  onLike: (post: PostView) => void app.toggleLike(post),
})

const Feed = ({
  view,
  app,
  viewer,
}: {
  view: FeedView
  app: ReturnType<typeof useTrumpetApp>
  viewer: UserView
}) => {
  const shared = cardHandlers(app)

  switch (view.name) {
    case 'home':
      return (
        <section className="feed">
          <header className="feed-header">
            <h1>Following</h1>
            <p>自己和已关注用户的文本时间线</p>
          </header>
          <Composer
            value={app.composerValue}
            onChange={app.setComposerValue}
            onSubmit={() => void app.createRootPost()}
          />
          <div className="post-list">
            {app.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                replyValue={app.replyValues[post.id] ?? ''}
                isReplying={app.openReplyId === post.id}
                onToggleReply={app.toggleReply}
                onReplyValueChange={app.setReplyValue}
                onSubmitReply={(postId) => void app.createReply(postId)}
                {...shared}
              />
            ))}
          </div>
          {app.posts.length === 0 && !app.loading ? (
            <div className="empty-state">
              <h2>时间线还很安静</h2>
              <p>先发一条帖子，或者去右侧打开 seed 用户主页再关注他们。</p>
            </div>
          ) : null}
          {app.nextCursor ? (
            <button
              className="load-more"
              type="button"
              onClick={() => void app.loadMore()}
              disabled={app.loading}
            >
              {app.loading ? '加载中...' : '加载更多'}
            </button>
          ) : null}
        </section>
      )
    case 'profile': {
      const profile = app.profile
      return (
        <section className="feed">
          <header className="profile-hero">
            <button className="ghost-button" type="button" onClick={app.goHome}>
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
                {viewer.id !== profile.id ? (
                  <button
                    className="primary-button small"
                    type="button"
                    onClick={() => void app.toggleFollow(profile)}
                  >
                    {profile.followedByMe ? 'Unfollow' : 'Follow'}
                  </button>
                ) : null}
              </>
            ) : (
              <p>{app.loading ? '加载中...' : '用户不存在'}</p>
            )}
          </header>
          <div className="post-list">
            {app.profilePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                replyValue=""
                isReplying={false}
                onToggleReply={() => undefined}
                onReplyValueChange={() => undefined}
                onSubmitReply={() => undefined}
                {...shared}
              />
            ))}
          </div>
        </section>
      )
    }
    default: {
      const unexpected: never = view
      return unexpected
    }
  }
}

export const App = () => {
  const app = useTrumpetApp()

  if (app.loading && !app.user) {
    return <div className="loading-screen">Loading Trumpet...</div>
  }

  if (!app.user) {
    return <AuthForm onAuthenticated={() => void app.boot()} />
  }

  const viewer = app.user

  return (
    <main className="app-shell">
      <Sidebar
        user={viewer}
        onHome={app.goHome}
        onProfile={() => void app.openProfile(viewer.handle)}
        onLogout={() => void app.logout()}
      />

      <div className="content-column">
        {app.error ? <p className="error-banner">{app.error}</p> : null}
        <Feed view={app.view} app={app} viewer={viewer} />
      </div>

      <RightPanel user={viewer} onOpenProfile={(handle) => void app.openProfile(handle)} />
    </main>
  )
}
