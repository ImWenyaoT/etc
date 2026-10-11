import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { PostView, UserView } from "@trumpet/shared";
import { api } from "../lib/api.js";
import {
  initialTrumpetState,
  reduceTrumpet,
} from "../state/trumpet-machine.js";

const messageFrom = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

export const useTrumpetApp = () => {
  const [state, dispatch] = useReducer(reduceTrumpet, initialTrumpetState);
  const [composerValue, setComposerValue] = useState("");
  const [replyValues, setReplyValues] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());
  const profileRequest = useRef(0);
  const [pending, setPending] = useState<string[]>([]);
  const begin = useCallback((key: string) => {
    if (inFlight.current.has(key)) return false;
    inFlight.current.add(key);
    setPending([...inFlight.current]);
    return true;
  }, []);
  const end = useCallback((key: string) => {
    inFlight.current.delete(key);
    setPending([...inFlight.current]);
  }, []);
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);

  const report = useCallback((cause: unknown, fallback: string) => {
    dispatch({ type: "error-reported", error: messageFrom(cause, fallback) });
  }, []);

  const boot = useCallback(async () => {
    dispatch({ type: "boot-started" });
    try {
      const me = await api.me();
      if (!me.user) {
        dispatch({ type: "session-empty" });
        return;
      }
      // Commit the session as soon as /me succeeds so a timeline failure
      // still leaves the authenticated shell (and error banner) visible.
      dispatch({
        type: "session-ready",
        user: me.user,
        posts: [],
        nextCursor: null,
      });
      try {
        const timeline = await api.timeline();
        dispatch({
          type: "timeline-replaced",
          posts: timeline.items,
          nextCursor: timeline.nextCursor,
        });
      } catch (cause) {
        report(cause, "页面未能打开，请刷新重试。");
      }
    } catch (cause) {
      report(cause, "页面未能打开，请刷新重试。");
    } finally {
      dispatch({ type: "loading-changed", loading: false });
    }
  }, [report]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const refreshTimeline = useCallback(async () => {
    const timeline = await api.timeline();
    dispatch({
      type: "timeline-replaced",
      posts: timeline.items,
      nextCursor: timeline.nextCursor,
    });
  }, []);

  const openProfile = useCallback(async (handle: string) => {
    const request = ++profileRequest.current;
    dispatch({ type: "profile-started", handle });
    try {
      const response = await api.userPosts(handle);
      if (request !== profileRequest.current) return;
      dispatch({
        type: "profile-loaded",
        user: response.user,
        posts: response.items,
      });
    } catch (cause) {
      if (request !== profileRequest.current) return;
      dispatch({
        type: "profile-failed",
        error: messageFrom(cause, "主页未能打开，请再试一次。"),
      });
    } finally {
      if (request === profileRequest.current)
        dispatch({ type: "loading-changed", loading: false });
    }
  }, []);

  const createRootPost = useCallback(async () => {
    if (!composerValue.trim() || !begin("post")) return;
    dispatch({ type: "error-reported", error: null });
    try {
      const response = await api.createPost({ body: composerValue });
      setComposerValue("");
      dispatch({ type: "post-prepended", post: response.post });
    } catch (cause) {
      report(cause, "发布失败，请再试一次。");
    } finally {
      end("post");
    }
  }, [composerValue, report, begin, end]);

  const createReply = useCallback(
    async (postId: string) => {
      const request = profileRequest.current;
      const body = replyValues[postId]?.trim();
      if (!body || !begin(`reply:${postId}`)) return;
      dispatch({ type: "error-reported", error: null });
      try {
        await api.createPost({ body, parentId: postId });
        setReplyValues((current) => ({ ...current, [postId]: "" }));
        setOpenReplyId(null);
        await refreshTimeline();
        if (request === profileRequest.current && state.view.name === "profile")
          await openProfile(state.view.handle);
      } catch (cause) {
        report(cause, "回复失败，请再试一次。");
      } finally {
        end(`reply:${postId}`);
      }
    },
    [refreshTimeline, replyValues, report, begin, end, state.view, openProfile],
  );

  const toggleLike = useCallback(
    async (post: PostView) => {
      if (!begin(`like:${post.id}`)) return;
      dispatch({ type: "error-reported", error: null });
      try {
        const response = post.likedByMe
          ? await api.unlikePost(post.id)
          : await api.likePost(post.id);
        dispatch({ type: "posts-patched", post: response.post });
      } catch (cause) {
        report(cause, "操作失败");
      } finally {
        end(`like:${post.id}`);
      }
    },
    [report, begin, end],
  );

  const loadMore = useCallback(async () => {
    if (!state.nextCursor || !begin("more")) return;
    const cursor = state.nextCursor;
    dispatch({ type: "loading-changed", loading: true });
    try {
      dispatch({ type: "error-reported", error: null });
      const timeline = await api.timeline(cursor);
      dispatch({
        type: "timeline-appended",
        posts: timeline.items,
        nextCursor: timeline.nextCursor,
      });
    } catch (cause) {
      report(cause, "未能加载更多，请再试一次。");
    } finally {
      end("more");
      dispatch({ type: "loading-changed", loading: false });
    }
  }, [report, state.nextCursor, begin, end]);

  const toggleFollow = useCallback(
    async (user: UserView) => {
      if (!begin(`follow:${user.id}`)) return;
      dispatch({ type: "error-reported", error: null });
      try {
        const response = user.followedByMe
          ? await api.unfollow(user.id)
          : await api.follow(user.id);
        dispatch({ type: "profile-updated", user: response.user });
        await refreshTimeline();
      } catch (cause) {
        report(cause, "关注设置未保存，请再试一次。");
      } finally {
        end(`follow:${user.id}`);
      }
    },
    [refreshTimeline, report, begin, end],
  );

  const logout = useCallback(async () => {
    if (!begin("logout")) return;
    try {
      await api.logout();
      profileRequest.current++;
      dispatch({ type: "session-cleared" });
      setComposerValue("");
      setReplyValues({});
      setOpenReplyId(null);
    } catch (cause) {
      report(cause, "退出失败，请再试一次。");
    } finally {
      end("logout");
    }
  }, [begin, end, report]);

  const goHome = useCallback(() => {
    profileRequest.current++;
    dispatch({ type: "view-home" });
    dispatch({ type: "loading-changed", loading: false });
  }, []);

  const toggleReply = useCallback((postId: string) => {
    setOpenReplyId((current) => (current === postId ? null : postId));
  }, []);

  const setReplyValue = useCallback((postId: string, value: string) => {
    setReplyValues((current) => ({ ...current, [postId]: value }));
  }, []);

  return {
    ...state,
    pending,
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
  };
};
