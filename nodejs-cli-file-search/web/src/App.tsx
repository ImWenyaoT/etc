import { useState } from "react";
import { useTask } from "./useTask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon, SearchIcon } from "lucide-react";
import {
  ToolLayout,
  Workspace,
  TaskError,
  TaskEmpty,
} from "@/components/tool-layout";
export default function App() {
  const [query, setQuery] = useState("");
  const [max, setMax] = useState(50);
  const task = useTask<{ items: string[] }>();
  const busy = task.status === "loading";
  return (
    <ToolLayout
      brand="文件搜索"
      index="文件工具"
      eyebrow="按名查找"
      title="文件搜索"
      description="输入部分文件名，查找指定文件夹。"
      footer="按文件名查找，显示文件所在位置。"
    >
      <Workspace>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>查找设置</h2>
            </CardTitle>
            <CardDescription>输入文件名即可查找。</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void task.run("/search", { query, max });
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="query">文件名</FieldLabel>
                  <Input
                    id="query"
                    name="query"
                    required
                    placeholder="如 README、config、.go"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-describedby="query-hint"
                  />
                  <FieldDescription id="query-hint">
                    输入部分名称即可，不分大小写。
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="max">显示上限</FieldLabel>
                  <Input
                    id="max"
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={max}
                    onChange={(e) => setMax(Number(e.target.value))}
                  />
                </Field>
                <Button type="submit" size="lg" disabled={busy}>
                  {busy ? (
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                  ) : (
                    <SearchIcon data-icon="inline-start" />
                  )}
                  {busy ? "查找中" : "查找文件"}
                </Button>
                <FieldDescription>
                  含子文件夹，跳过依赖和生成文件。
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <Card className="min-h-96 min-w-0" aria-busy={busy}>
          <CardHeader>
            <CardTitle>
              <h2>查找结果</h2>
            </CardTitle>
            <CardDescription role="status">
              {task.status === "success"
                ? `找到 ${task.data!.items.length} 个文件`
                : busy
                  ? "查找中"
                  : task.status === "error"
                    ? "查找失败"
                    : "等待查找"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {task.status === "error" ? (
              <TaskError message={task.error} />
            ) : task.status === "success" && task.data!.items.length > 0 ? (
              <ul className="divide-y">
                {task.data!.items.map((path) => (
                  <li className="flex gap-3 py-4" key={path}>
                    <FileIcon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <strong className="text-sm font-medium">
                        {path.split(/[\/]/).pop()}
                      </strong>
                      <code className="mt-1 block text-xs leading-6 wrap-anywhere text-muted-foreground">
                        {path}
                      </code>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <TaskEmpty
                loading={busy}
                title={
                  task.status === "success"
                    ? "未找到"
                    : busy
                      ? "查找中"
                      : "开始查找"
                }
                description={
                  task.status === "success"
                    ? "缩短文件名，或确认查找的文件夹。"
                    : "这里显示文件名和所在位置。"
                }
              />
            )}
          </CardContent>
        </Card>
      </Workspace>
    </ToolLayout>
  );
}
