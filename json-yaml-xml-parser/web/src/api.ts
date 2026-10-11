export async function request<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api" + path, {
    signal,
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  }).catch((error: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    )
      throw error;
    throw new Error("无法连接，请检查网络。");
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error("暂时无法使用，请稍后再试。");
  }
  if (!response.ok) throw new Error(friendlyMessage(data.error?.message));
  return data as T;
}

function friendlyMessage(message?: string): string {
  if (!message) return "操作失败，请再试一次。";
  if (message.startsWith("failed to parse ")) {
    const format = message
      .match(/^failed to parse (json|yaml|xml):/)?.[1]
      ?.toUpperCase();
    return format ? `${format} 内容有误，请检查。` : "文档内容有误，请检查。";
  }
  const messages: Record<string, string> = {
    "expected one JSON value": "提交内容有误，请刷新后重试。",
  };
  if (message.startsWith("unsupported or missing format:"))
    return "请选择 JSON、YAML 或 XML。";
  return messages[message] ?? message;
}
