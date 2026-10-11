import { afterEach, expect, it, vi } from "vitest";
import { request } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("将解析异常转成白话提示，隐藏底层解析详情", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: "failed to parse yaml: line 2: unexpected token",
            },
          }),
          { status: 400 },
        ),
      ),
  );
  await expect(
    request("/parse", { format: "yaml", source: "name: [" }),
  ).rejects.toThrow("YAML 内容有误，请检查。");
});
it("网络中断显示连接提示，取消请求仍保留取消信号", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new DOMException("Aborted", "AbortError")),
  );
  await expect(request("/parse", {})).rejects.toThrow("无法连接，请检查网络。");
  await expect(request("/parse", {})).rejects.toMatchObject({
    name: "AbortError",
  });
});
