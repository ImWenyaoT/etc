import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("解析表单", () => {
  it("切换格式、载入示例后提交对应格式，重复点击不会清空选择", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { name: "Ada" } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<App />);
    const json = screen.getByRole("button", { name: /^JSON$/ });
    fireEvent.click(json);
    fireEvent.click(json);
    expect(json.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "填入示例" }));
    fireEvent.click(screen.getByRole("button", { name: "转换文档" }));
    await screen.findByText("转换完成");
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.format).toBe("json");
    expect(JSON.parse(body.source)).toEqual({
      name: "Ada",
      skills: ["JSON", "YAML", "XML"],
    });
  });

  it("将服务端解析错误关联到源文档输入", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "文档格式无效" } }), {
          status: 400,
        }),
      ),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "转换文档" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("文档格式无效");
    const source = screen.getByRole("textbox", { name: "原文" });
    expect(source.getAttribute("aria-invalid")).toBe("true");
    const description = document.getElementById(
      source.getAttribute("aria-describedby")!,
    );
    expect(description?.contains(alert)).toBe(true);
  });
});
