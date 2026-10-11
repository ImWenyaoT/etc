import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PostView,
  TimelineResponse,
  UserPostsResponse,
  UserView,
} from "@trumpet/shared";
import { App } from "./App.js";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    timeline: vi.fn(),
    createPost: vi.fn(),
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    user: vi.fn(),
    userPosts: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  },
}));

vi.mock("./lib/api.js", () => ({ api: apiMock }));

const mina: UserView = {
  id: "user-mina",
  handle: "mina",
  displayName: "Mina Chen",
  bio: "",
  createdAt: "2026-06-16T12:00:00.000Z",
};

const leo: UserView = {
  id: "user-leo",
  handle: "leo",
  displayName: "Leo Park",
  bio: "",
  createdAt: "2026-06-16T12:00:00.000Z",
  followerCount: 1,
  followingCount: 0,
  followedByMe: true,
};

const postFixture = (overrides: Partial<PostView> = {}): PostView => ({
  id: "post-1",
  body: "Existing timeline post",
  parentId: null,
  author: leo,
  likeCount: 0,
  replyCount: 0,
  likedByMe: false,
  createdAt: "2026-06-16T12:30:00.000Z",
  ...overrides,
});

const timelineFixture = (
  items: PostView[],
  nextCursor: string | null = null,
): TimelineResponse => ({ items, nextCursor });

const userPostsFixture = (
  user: UserView,
  items: PostView[],
): UserPostsResponse => ({
  user,
  items,
  nextCursor: null,
});

const openLeoSuggestion = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(
    await screen.findByRole("textbox", { name: "对方账号" }),
    "leo",
  );
  await user.click(screen.getByRole("button", { name: "查看主页" }));
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("App authentication", () => {
  it("renders the login form and loads the timeline after login", async () => {
    const user = userEvent.setup();
    apiMock.me
      .mockResolvedValueOnce({ user: null })
      .mockResolvedValueOnce({ user: mina });
    apiMock.login.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([postFixture()]));

    render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: "分享近况",
      }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("账号"), "mina");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getAllByRole("button", { name: "登录" }).at(-1)!);
    expect(
      await screen.findByRole("heading", { name: "关注动态" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Existing timeline post")).toBeInTheDocument();
    expect(apiMock.login).toHaveBeenCalledWith({
      handle: "mina",
      password: "password123",
    });
  });

  it("shows authentication errors without leaving the login screen", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: null });
    apiMock.login.mockRejectedValue(
      new Error("账号或密码不正确，请重新输入。"),
    );

    render(<App />);
    await screen.findByRole("heading", {
      name: "分享近况",
    });
    await user.type(screen.getByLabelText("账号"), "mina");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getAllByRole("button", { name: "登录" }).at(-1)!);

    expect(
      await screen.findByText("账号或密码不正确，请重新输入。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "关注动态" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the authenticated shell when the timeline fails after /me succeeds", async () => {
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockRejectedValue(new Error("时间线不可用"));

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "关注动态" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("时间线不可用")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("时间线不可用");
    expect(
      screen.queryByRole("heading", {
        name: "分享近况",
      }),
    ).not.toBeInTheDocument();
  });

  it("registers a new account and then boots the authenticated timeline", async () => {
    const user = userEvent.setup();
    apiMock.me
      .mockResolvedValueOnce({ user: null })
      .mockResolvedValueOnce({ user: mina });
    apiMock.register.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));

    render(<App />);
    await screen.findByRole("heading", {
      name: "分享近况",
    });
    await user.click(screen.getByRole("button", { name: "注册" }));
    await user.clear(screen.getByLabelText("账号"));
    await user.type(screen.getByLabelText("账号"), "newuser");
    await user.clear(screen.getByLabelText("昵称"));
    await user.type(screen.getByLabelText("昵称"), "New User");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: "注册账号" }));

    expect(apiMock.register).toHaveBeenCalledWith({
      handle: "newuser",
      displayName: "New User",
      password: "password123",
    });
    expect(
      await screen.findByRole("heading", { name: "关注动态" }),
    ).toBeInTheDocument();
  });

  it("logs out and returns to the auth form", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));
    apiMock.logout.mockResolvedValue(undefined);

    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "关注动态" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "退出登录" }));

    expect(
      await screen.findByRole("heading", {
        name: "分享近况",
      }),
    ).toBeInTheDocument();
    expect(apiMock.logout).toHaveBeenCalledTimes(1);
  });
});

describe("App timeline interactions", () => {
  it("does not create a post for an empty composer", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));

    render(<App />);
    await screen.findByRole("heading", { name: "关注动态" });
    const button = screen.getByRole("button", { name: /发布/ });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(apiMock.createPost).not.toHaveBeenCalled();
  });

  it("creates a post and prepends it to the timeline", async () => {
    const user = userEvent.setup();
    const newPost = postFixture({
      id: "post-new",
      body: "A new post from the composer",
      author: mina,
    });
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([postFixture()]));
    apiMock.createPost.mockResolvedValue({ post: newPost });

    render(<App />);
    const composer = await screen.findByPlaceholderText("分享一下你的近况吧。");
    await user.type(composer, "A new post from the composer");
    await user.click(screen.getByRole("button", { name: /发布/ }));

    expect(apiMock.createPost).toHaveBeenCalledWith({
      body: "A new post from the composer",
    });
    expect(
      await screen.findByText("A new post from the composer"),
    ).toBeInTheDocument();
    expect(composer).toHaveValue("");
  });

  it("surfaces an error banner with the fallback message when a post fails", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));
    apiMock.createPost.mockRejectedValue("network down");

    render(<App />);
    const composer = await screen.findByPlaceholderText("分享一下你的近况吧。");
    await user.type(composer, "This post will fail");
    await user.click(screen.getByRole("button", { name: /发布/ }));

    expect(
      await screen.findByText("发布失败，请再试一次。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "发布失败，请再试一次。",
    );
    expect(composer).toHaveValue("This post will fail");
  });

  it("likes and unlikes timeline posts in place", async () => {
    const user = userEvent.setup();
    const basePost = postFixture();
    const likedPost = postFixture({ likeCount: 1, likedByMe: true });
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([basePost]));
    apiMock.likePost.mockResolvedValue({ post: likedPost });
    apiMock.unlikePost.mockResolvedValue({ post: basePost });

    render(<App />);
    await screen.findByText("Existing timeline post");
    await user.click(screen.getByRole("button", { name: "点赞 0" }));
    expect(
      await screen.findByRole("button", { name: "已赞 1" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "已赞 1" }));
    expect(
      await screen.findByRole("button", { name: "点赞 0" }),
    ).toBeInTheDocument();
    expect(apiMock.likePost).toHaveBeenCalledWith("post-1");
    expect(apiMock.unlikePost).toHaveBeenCalledWith("post-1");
  });

  it("creates replies and refreshes the timeline reply count", async () => {
    const user = userEvent.setup();
    const basePost = postFixture();
    const repliedPost = postFixture({ replyCount: 1 });
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline
      .mockResolvedValueOnce(timelineFixture([basePost]))
      .mockResolvedValueOnce(timelineFixture([repliedPost]));
    apiMock.createPost.mockResolvedValue({
      post: postFixture({
        id: "reply-1",
        parentId: "post-1",
        body: "Reply body",
      }),
    });

    render(<App />);
    await screen.findByText("Existing timeline post");
    await user.click(screen.getByRole("button", { name: "回复 0" }));
    await user.type(screen.getByPlaceholderText("回复 @leo"), "Reply body");
    await user.click(screen.getByRole("button", { name: /回复$/ }));

    expect(apiMock.createPost).toHaveBeenCalledWith({
      body: "Reply body",
      parentId: "post-1",
    });
    expect(
      await screen.findByRole("button", { name: "回复 1" }),
    ).toBeInTheDocument();
  });

  it("does not submit an empty reply", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([postFixture()]));

    render(<App />);
    await screen.findByText("Existing timeline post");
    await user.click(screen.getByRole("button", { name: "回复 0" }));

    expect(screen.getByRole("button", { name: /回复$/ })).toBeDisabled();
    expect(apiMock.createPost).not.toHaveBeenCalled();
  });

  it("loads another page when a timeline cursor is present", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline
      .mockResolvedValueOnce(
        timelineFixture(
          [postFixture({ id: "post-1", body: "First page" })],
          "cursor-1",
        ),
      )
      .mockResolvedValueOnce(
        timelineFixture([postFixture({ id: "post-2", body: "Second page" })]),
      );

    render(<App />);
    expect(await screen.findByText("First page")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看更多" }));
    expect(await screen.findByText("Second page")).toBeInTheDocument();
    expect(apiMock.timeline).toHaveBeenLastCalledWith("cursor-1");
  });
});

describe("App profile interactions", () => {
  it("opens a profile and follows the visible user", async () => {
    const user = userEvent.setup();
    const unfollowedLeo = { ...leo, followedByMe: false, followerCount: 0 };
    const followedLeo = { ...leo, followedByMe: true, followerCount: 1 };
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));
    apiMock.userPosts.mockResolvedValue(userPostsFixture(unfollowedLeo, []));
    apiMock.follow.mockResolvedValue({ user: followedLeo });

    render(<App />);
    await openLeoSuggestion(user);
    expect(
      await screen.findByRole("heading", { name: "Leo Park" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "关注" }));
    expect(
      await screen.findByRole("button", { name: "取消关注" }),
    ).toBeInTheDocument();
    expect(apiMock.follow).toHaveBeenCalledWith("user-leo");
  });

  it("opens a profile and unfollows the visible user", async () => {
    const user = userEvent.setup();
    const leoPost = postFixture();
    const unfollowedLeo = { ...leo, followedByMe: false, followerCount: 0 };
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([leoPost]));
    apiMock.userPosts.mockResolvedValue(userPostsFixture(leo, [leoPost]));
    apiMock.unfollow.mockResolvedValue({ user: unfollowedLeo });

    render(<App />);
    await openLeoSuggestion(user);
    expect(
      await screen.findByRole("heading", { name: "Leo Park" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Existing timeline post")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消关注" }));
    expect(
      await screen.findByRole("button", { name: "关注" }),
    ).toBeInTheDocument();
    expect(apiMock.unfollow).toHaveBeenCalledWith("user-leo");
  });

  it("returns home from a profile without clearing the timeline", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(
      timelineFixture([postFixture({ body: "Still on the timeline" })]),
    );
    apiMock.userPosts.mockResolvedValue(userPostsFixture(leo, []));

    render(<App />);
    await openLeoSuggestion(user);
    expect(
      await screen.findByRole("heading", { name: "Leo Park" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回动态" }));

    expect(
      await screen.findByRole("heading", { name: "关注动态" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Still on the timeline")).toBeInTheDocument();
  });

  it("shows profile loading errors when user lookup fails", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));
    apiMock.userPosts.mockRejectedValue(new Error("未找到该账号。"));

    render(<App />);
    await openLeoSuggestion(user);
    expect(
      (await screen.findAllByText("未找到该账号。")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("alert")).toHaveTextContent("未找到该账号。");
  });
});

describe("async interaction safety", () => {
  it("locks a post submission until the server responds", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));
    let resolve!: (value: unknown) => void;
    apiMock.createPost.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<App />);
    await user.type(
      await screen.findByRole("textbox", { name: "帖子内容" }),
      "Pending post",
    );
    await user.click(screen.getByRole("button", { name: "发布" }));
    expect(screen.getByRole("button", { name: "发送中" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "发送中" }));
    expect(apiMock.createPost).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolve({ post: postFixture({ body: "Pending post", author: mina }) }),
    );
    expect(await screen.findByText("Pending post")).toBeInTheDocument();
  });
  it("does not let an older profile response replace a newer one", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));
    let resolve!: (value: unknown) => void;
    apiMock.userPosts
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValueOnce(userPostsFixture(mina, []));
    render(<App />);
    await openLeoSuggestion(user);
    const lookup = screen.getByRole("textbox", { name: "对方账号" });
    await user.clear(lookup);
    await user.type(lookup, "mina");
    await user.click(screen.getByRole("button", { name: "查看主页" }));
    expect(
      await screen.findByRole("heading", { name: "Mina Chen", level: 1 }),
    ).toBeInTheDocument();
    await act(async () => resolve(userPostsFixture(leo, [])));
    expect(
      screen.queryByRole("heading", { name: "Leo Park" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mina Chen", level: 1 }),
    ).toBeInTheDocument();
  });
  it("keeps the session and reports a failed logout", async () => {
    const user = userEvent.setup();
    apiMock.me.mockResolvedValue({ user: mina });
    apiMock.timeline.mockResolvedValue(timelineFixture([]));
    apiMock.logout.mockRejectedValue(new Error("网络暂时不可用"));
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "退出登录" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "网络暂时不可用",
    );
    expect(
      screen.getByRole("heading", { name: "关注动态" }),
    ).toBeInTheDocument();
  });
});

it("allows replying from a user profile and refreshes its reply count", async () => {
  const user = userEvent.setup();
  const post = postFixture();
  apiMock.me.mockResolvedValue({ user: mina });
  apiMock.timeline.mockResolvedValue(timelineFixture([]));
  apiMock.userPosts
    .mockResolvedValueOnce(userPostsFixture(leo, [post]))
    .mockResolvedValueOnce(userPostsFixture(leo, [{ ...post, replyCount: 1 }]));
  apiMock.createPost.mockResolvedValue({
    post: postFixture({ parentId: post.id, body: "Profile reply" }),
  });
  render(<App />);
  await openLeoSuggestion(user);
  await user.click(await screen.findByRole("button", { name: "回复 0" }));
  await user.type(
    screen.getByRole("textbox", { name: "回复内容" }),
    "Profile reply",
  );
  await user.click(screen.getByRole("button", { name: "回复" }));
  expect(
    await screen.findByRole("button", { name: "回复 1" }),
  ).toBeInTheDocument();
  expect(apiMock.createPost).toHaveBeenCalledWith({
    body: "Profile reply",
    parentId: post.id,
  });
});
