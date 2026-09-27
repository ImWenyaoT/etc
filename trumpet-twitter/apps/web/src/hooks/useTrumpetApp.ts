import { useCallback, useEffect, useReducer, useState } from 'react'
import type { PostView, UserView } from '@trumpet/shared'
import { api } from '../lib/api.js'
import { initialTrumpetState, reduceTrumpet } from '../state/trumpet-machine.js'

const messageFrom = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback

export const useTrumpetApp = () => {
  const [state, dispatch] = useReducer(reduceTrumpet, initialTrumpetState)
  const [composerValue, setComposerValue] = useState('')
  const [replyValues, setReplyValues] = useState<Record<string, string>>({})
  const [openReplyId, setOpenReplyId] = useState<string | null>(null)

  const report = useCallback((cause: unknown, fallback: string) => {
    dispatch({ type: 'error-reported', error: messageFrom(cause, fallback) })
  }, [])

  const boot = useCallback(async () => {
    dispatch({ type: 'boot-started' })
    try {
      const me = await api.me()
      if (!me.user) {
        dispatch({ type: 'session-empty' })
        return
      }
      const timeline = await api.timeline()
      dispatch({
        type: 'session-ready',
        user: me.user,
        posts: timeline.items,
        nextCursor: timeline.nextCursor,
      })
    } catch (cause) {
      report(cause, '启动失败')
    } finally {
      dispatch({ type: 'loading-changed', loading: false })
    }
  }, [report])

  useEffect(() => {
    void boot()
  }, [boot])

  const refreshTimeline = useCallback(async () => {
    const timeline = await api.timeline()
    dispatch({
      type: 'timeline-replaced',
      posts: timeline.items,
      nextCursor: timeline.nextCursor,
    })
  }, [])

  const openProfile = useCallback(async (handle: string) => {
    dispatch({ type: 'profile-started', handle })
    try {
      const response = await api.userPosts(handle)
      dispatch({ type: 'profile-loaded', user: response.user, posts: response.items })
    } catch (cause) {
      dispatch({ type: 'profile-failed', error: messageFrom(cause, '用户加载失败') })
    } finally {
      dispatch({ type: 'loading-changed', loading: false })
    }
  }, [])

  const createRootPost = useCallback(async () => {
    if (!composerValue.trim()) return
    dispatch({ type: 'error-reported', error: null })
    try {
      const response = await api.createPost({ body: composerValue })
      setComposerValue('')
      dispatch({ type: 'post-prepended', post: response.post })
    } catch (cause) {
      report(cause, '发帖失败')
    }
  }, [composerValue, report])

  const createReply = useCallback(
    async (postId: string) => {
      const body = replyValues[postId]?.trim()
      if (!body) return
      dispatch({ type: 'error-reported', error: null })
      try {
        await api.createPost({ body, parentId: postId })
        setReplyValues((current) => ({ ...current, [postId]: '' }))
        setOpenReplyId(null)
        await refreshTimeline()
      } catch (cause) {
        report(cause, '回复失败')
      }
    },
    [refreshTimeline, replyValues, report],
  )

  const toggleLike = useCallback(
    async (post: PostView) => {
      dispatch({ type: 'error-reported', error: null })
      try {
        const response = post.likedByMe
          ? await api.unlikePost(post.id)
          : await api.likePost(post.id)
        dispatch({ type: 'posts-patched', post: response.post })
      } catch (cause) {
        report(cause, '操作失败')
      }
    },
    [report],
  )

  const loadMore = useCallback(async () => {
    if (!state.nextCursor) return
    const cursor = state.nextCursor
    dispatch({ type: 'loading-changed', loading: true })
    try {
      dispatch({ type: 'error-reported', error: null })
      const timeline = await api.timeline(cursor)
      dispatch({
        type: 'timeline-appended',
        posts: timeline.items,
        nextCursor: timeline.nextCursor,
      })
    } catch (cause) {
      report(cause, '加载更多失败')
    } finally {
      dispatch({ type: 'loading-changed', loading: false })
    }
  }, [report, state.nextCursor])

  const toggleFollow = useCallback(
    async (user: UserView) => {
      dispatch({ type: 'error-reported', error: null })
      try {
        const response = user.followedByMe ? await api.unfollow(user.id) : await api.follow(user.id)
        dispatch({ type: 'profile-updated', user: response.user })
        await refreshTimeline()
      } catch (cause) {
        report(cause, '关注操作失败')
      }
    },
    [refreshTimeline, report],
  )

  const logout = useCallback(async () => {
    await api.logout()
    dispatch({ type: 'session-cleared' })
  }, [])

  const goHome = useCallback(() => {
    dispatch({ type: 'view-home' })
  }, [])

  const toggleReply = useCallback((postId: string) => {
    setOpenReplyId((current) => (current === postId ? null : postId))
  }, [])

  const setReplyValue = useCallback((postId: string, value: string) => {
    setReplyValues((current) => ({ ...current, [postId]: value }))
  }, [])

  return {
    ...state,
    composerValue,
    setComposerValue,
    replyValues,
    openReplyId,
    boot,
    openProfile,
    createRootPost,
    createReply,
    toggleLike,
    loadMore,
    toggleFollow,
    logout,
    goHome,
    toggleReply,
    setReplyValue,
  }
}
