import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "./api";
export type Task<T> = {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string;
};
export function useTask<T>() {
  const [task, setTask] = useState<Task<T>>({
    status: "idle",
    data: null,
    error: "",
  });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = useCallback(async (path: string, body: unknown) => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setTask({ status: "loading", data: null, error: "" });
    try {
      const data = await request<T>(path, body, active.signal);
      if (!active.signal.aborted)
        setTask({ status: "success", data, error: "" });
    } catch (error) {
      if (!active.signal.aborted)
        setTask({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "请求失败",
        });
    }
  }, []);
  return { ...task, run };
}
