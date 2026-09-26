import { Heart, MessageCircle } from 'lucide-react'
import type { PostView } from '@trumpet/shared'
import { Composer } from './Composer.js'

interface PostCardProps {
  post: PostView
  replyValue: string
  isReplying: boolean
  onOpenProfile: (handle: string) => void
  onLike: (post: PostView) => void
  onToggleReply: (postId: string) => void
  onReplyValueChange: (postId: string, value: string) => void
  onSubmitReply: (postId: string) => void
}

export const PostCard = ({
  post,
  replyValue,
  isReplying,
  onOpenProfile,
  onLike,
  onToggleReply,
  onReplyValueChange,
  onSubmitReply,
}: PostCardProps) => {
  const createdAt = new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(post.createdAt))

  return (
    <article className="post-card">
      <button
        className="avatar-button"
        type="button"
        onClick={() => onOpenProfile(post.author.handle)}
      >
        {post.author.displayName.slice(0, 1).toUpperCase()}
      </button>

      <div className="post-main">
        <header className="post-header">
          <button
            type="button"
            className="author-button"
            onClick={() => onOpenProfile(post.author.handle)}
          >
            {post.author.displayName}
          </button>
          <span>@{post.author.handle}</span>
          <span>{createdAt}</span>
        </header>

        <p className="post-body">{post.body}</p>

        <div className="post-actions">
          <button type="button" onClick={() => onToggleReply(post.id)}>
            <MessageCircle size={16} aria-hidden="true" />
            Reply {post.replyCount}
          </button>
          <button
            className={post.likedByMe ? 'liked' : ''}
            type="button"
            onClick={() => onLike(post)}
          >
            <Heart size={16} aria-hidden="true" />
            Like {post.likeCount}
          </button>
        </div>

        {isReplying ? (
          <Composer
            compact
            value={replyValue}
            placeholder={`回复 @${post.author.handle}`}
            buttonLabel="Reply"
            onChange={(value) => onReplyValueChange(post.id, value)}
            onSubmit={() => onSubmitReply(post.id)}
          />
        ) : null}
      </div>
    </article>
  )
}
