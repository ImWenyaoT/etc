import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle } from "lucide-react";
import type { PostView } from "@trumpet/shared";
import { Composer } from "./Composer.js";

interface PostCardProps {
  post: PostView;
  replyValue: string;
  isReplying: boolean;
  isSubmitting?: boolean;
  isLiking?: boolean;
  onOpenProfile: (handle: string) => void;
  onLike: (post: PostView) => void;
  onToggleReply: (postId: string) => void;
  onReplyValueChange: (postId: string, value: string) => void;
  onSubmitReply: (postId: string) => void;
}

export const PostCard = ({
  post,
  replyValue,
  isReplying,
  isSubmitting,
  isLiking,
  onOpenProfile,
  onLike,
  onToggleReply,
  onReplyValueChange,
  onSubmitReply,
}: PostCardProps) => {
  const createdAt = new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(post.createdAt));

  return (
    <article className="flex gap-3 border-b p-4 md:p-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 p-0"
        type="button"
        onClick={() => onOpenProfile(post.author.handle)}
      >
        <Avatar size="lg">
          <AvatarFallback>
            {post.author.displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Button>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => onOpenProfile(post.author.handle)}
          >
            {post.author.displayName}
          </Button>
          <span>@{post.author.handle}</span>
          <time dateTime={post.createdAt}>{createdAt}</time>
        </header>

        <p className="my-3 text-sm leading-7 whitespace-pre-wrap wrap-anywhere">
          {post.body}
        </p>

        <div className="flex gap-4">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onToggleReply(post.id)}
          >
            <MessageCircle data-icon="inline-start" aria-hidden="true" />
            回复 {post.replyCount}
          </Button>
          <Button
            disabled={isLiking}
            aria-pressed={post.likedByMe}
            variant={post.likedByMe ? "liked" : "ghost"}
            size="sm"
            type="button"
            onClick={() => onLike(post)}
          >
            <Heart data-icon="inline-start" aria-hidden="true" />
            {post.likedByMe ? "已赞" : "点赞"} {post.likeCount}
          </Button>
        </div>

        {isReplying ? (
          <Composer
            isSubmitting={isSubmitting ?? false}
            compact
            value={replyValue}
            placeholder={`回复 @${post.author.handle}`}
            buttonLabel="回复"
            onChange={(value) => onReplyValueChange(post.id, value)}
            onSubmit={() => onSubmitReply(post.id)}
          />
        ) : null}
      </div>
    </article>
  );
};
