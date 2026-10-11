import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { PostView, UserView } from "@trumpet/shared";
import { AuthForm } from "./components/AuthForm.js";
import { Composer } from "./components/Composer.js";
import { PostCard } from "./components/PostCard.js";
import { RightPanel } from "./components/RightPanel.js";
import { Sidebar } from "./components/Sidebar.js";
import { useTrumpetApp } from "./hooks/useTrumpetApp.js";
import type { FeedView } from "./state/trumpet-machine.js";

const cardHandlers = (
  app: Pick<ReturnType<typeof useTrumpetApp>, "openProfile" | "toggleLike">,
) => ({
  onOpenProfile: (handle: string) => void app.openProfile(handle),
  onLike: (post: PostView) => void app.toggleLike(post),
});

const Feed = ({
  view,
  app,
  viewer,
}: {
  view: FeedView;
  app: ReturnType<typeof useTrumpetApp>;
  viewer: UserView;
}) => {
  const shared = cardHandlers(app);

  switch (view.name) {
    case "home":
      return (
        <section className="min-w-0">
          <header className="border-b p-4 md:p-6">
            <h1 className="text-2xl font-semibold tracking-tight">关注动态</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              查看自己和关注的人发布的帖子。
            </p>
          </header>
          <Composer
            isSubmitting={app.pending.includes("post")}
            value={app.composerValue}
            onChange={app.setComposerValue}
            onSubmit={() => void app.createRootPost()}
          />
          <div className="post-list">
            {app.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                replyValue={app.replyValues[post.id] ?? ""}
                isReplying={app.openReplyId === post.id}
                isSubmitting={app.pending.includes(`reply:${post.id}`)}
                isLiking={app.pending.includes(`like:${post.id}`)}
                onToggleReply={app.toggleReply}
                onReplyValueChange={app.setReplyValue}
                onSubmitReply={(postId) => void app.createReply(postId)}
                {...shared}
              />
            ))}
          </div>
          {app.posts.length === 0 && !app.loading ? (
            <Empty className="min-h-64">
              <EmptyHeader>
                <EmptyTitle>
                  <h2>暂无动态</h2>
                </EmptyTitle>
                <EmptyDescription>
                  先发一条帖子，或查找账号并关注。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {app.nextCursor ? (
            <Button
              variant="outline"
              className="mx-auto my-6 flex"
              type="button"
              onClick={() => void app.loadMore()}
              disabled={app.loading}
            >
              {app.loading ? "加载中" : "查看更多"}
            </Button>
          ) : null}
        </section>
      );
    case "profile": {
      const profile = app.profile;
      return (
        <section className="min-w-0">
          <header className="flex flex-col items-start gap-4 border-b p-4 md:p-6">
            <Button variant="ghost" type="button" onClick={app.goHome}>
              返回动态
            </Button>
            {profile ? (
              <>
                <Avatar className="size-16">
                  <AvatarFallback>
                    {profile.displayName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-semibold wrap-anywhere">
                    {profile.displayName}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    @{profile.handle}
                  </p>
                  <p className="mt-3 text-sm leading-7 wrap-anywhere">
                    {profile.bio || "还没有填写个人简介。"}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>粉丝 {profile.followerCount ?? 0}</span>
                  <span>关注 {profile.followingCount ?? 0}</span>
                </div>
                {viewer.id !== profile.id ? (
                  <Button
                    size="sm"
                    type="button"
                    disabled={app.pending.includes(`follow:${profile.id}`)}
                    onClick={() => void app.toggleFollow(profile)}
                  >
                    {profile.followedByMe ? "取消关注" : "关注"}
                  </Button>
                ) : null}
              </>
            ) : (
              <p>{app.loading ? "加载中" : "未找到该账号。"}</p>
            )}
          </header>
          <div className="post-list">
            {app.profilePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                replyValue={app.replyValues[post.id] ?? ""}
                isReplying={app.openReplyId === post.id}
                isSubmitting={app.pending.includes(`reply:${post.id}`)}
                isLiking={app.pending.includes(`like:${post.id}`)}
                onToggleReply={app.toggleReply}
                onReplyValueChange={app.setReplyValue}
                onSubmitReply={(postId) => void app.createReply(postId)}
                {...shared}
              />
            ))}
          </div>
        </section>
      );
    }
    default: {
      const unexpected: never = view;
      return unexpected;
    }
  }
};

export const App = () => {
  const app = useTrumpetApp();

  if (app.loading && !app.user) {
    return (
      <div
        role="status"
        className="flex min-h-svh items-center justify-center gap-3"
      >
        <Spinner />
        加载中
      </div>
    );
  }

  if (!app.user) {
    return <AuthForm onAuthenticated={() => void app.boot()} />;
  }

  const viewer = app.user;

  return (
    <main className="mx-auto grid max-w-7xl md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <Sidebar
        active={app.view.name}
        user={viewer}
        onHome={app.goHome}
        onProfile={() => void app.openProfile(viewer.handle)}
        onLogout={() => void app.logout()}
      />

      <div className="min-w-0 border-x bg-card md:min-h-svh">
        {app.error ? (
          <Alert variant="destructive" className="mx-4 mt-4 w-auto">
            <AlertDescription>{app.error}</AlertDescription>
          </Alert>
        ) : null}
        <Feed view={app.view} app={app} viewer={viewer} />
      </div>

      <RightPanel
        user={viewer}
        onOpenProfile={(handle) => void app.openProfile(handle)}
      />
    </main>
  );
};
