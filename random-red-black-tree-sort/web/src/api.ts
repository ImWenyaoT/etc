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
  const messages: Record<string, string> = {
    "count must be between 1 and 1000000": "数字个数需在1～100万之间。",
    "expected one JSON value": "提交内容有误，请刷新后重试。",
  };
  return messages[message] ?? message;
}
