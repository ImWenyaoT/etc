import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useTask } from "./useTask";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("request lifecycle", () => {
  it("shows errors and recovers on retry", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "目录不存在" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: ["README.md"] }),
      });
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() => useTask<{ items: string[] }>());
    await act(() => result.current.run("/search", {}));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("目录不存在");
    await act(() => result.current.run("/search", {}));
    expect(result.current.status).toBe("success");
    expect(result.current.data?.items).toEqual(["README.md"]);
    expect(result.current.error).toBe("");
  });
  it("ignores late responses and aborts on unmount", async () => {
    let resolveFirst!: (v: unknown) => void;
    let signal: AbortSignal | undefined;
    const fetch = vi
      .fn()
      .mockImplementationOnce((_: string, options: RequestInit) => {
        signal = options.signal as AbortSignal;
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: "new" }),
      });
    vi.stubGlobal("fetch", fetch);
    const { result, unmount } = renderHook(() => useTask<{ value: string }>());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.run("/work", {});
    });
    expect(result.current.status).toBe("loading");
    await act(() => result.current.run("/work", {}));
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      resolveFirst({ ok: true, json: async () => ({ value: "old" }) });
      await pending;
    });
    expect(result.current.data?.value).toBe("new");
    const active = fetch.mock.calls[1][1].signal;
    unmount();
    expect(active.aborted).toBe(true);
  });
  it("reports an unavailable service instead of leaking JSON syntax errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new SyntaxError("html");
        },
      }),
    );
    const { result } = renderHook(() => useTask());
    await act(() => result.current.run("/work", {}));
    await waitFor(() =>
      expect(result.current.error).toBe("暂时无法使用，请稍后再试。"),
    );
  });
});
