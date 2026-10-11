import { useState } from "react";
import { useTask } from "./useTask";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import {
  ToolLayout,
  Workspace,
  TaskError,
  TaskEmpty,
} from "@/components/tool-layout";
const samples: Record<string, string> = {
  json: '{\n  "name": "Ada",\n  "skills": ["JSON", "YAML", "XML"]\n}',
  yaml: "name: Ada\nskills:\n  - JSON\n  - YAML\n  - XML",
  xml: '<person id="1">\n  <name>Ada</name>\n  <skill>JSON</skill>\n  <skill>XML</skill>\n</person>',
};
export default function App() {
  const [format, setFormat] = useState("yaml");
  const [source, setSource] = useState(samples.yaml);
  const task = useTask<{ data: unknown }>();
  const busy = task.status === "loading";
  return (
    <ToolLayout
      brand="文档转换"
      index="文档工具"
      eyebrow="查看内容"
      title="文档转换"
      description="粘贴文档，转成易读的 JSON。"
      footer={
        <>
          属性存入 $attributes。
          <br />
          文本存入 $text。
        </>
      }
    >
      <Workspace editor>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>原文</h2>
            </CardTitle>
            <CardDescription>选好格式，再粘贴内容。</CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSource(samples[format])}
              >
                填入示例
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void task.run("/parse", { source, format });
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel id="format-label">原文格式</FieldLabel>
                  <ToggleGroup
                    aria-labelledby="format-label"
                    value={[format]}
                    onValueChange={(values) => {
                      if (values[0]) setFormat(values[0]);
                    }}
                    variant="outline"
                  >
                    {["json", "yaml", "xml"].map((f) => (
                      <ToggleGroupItem key={f} value={f}>
                        {f.toUpperCase()}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
                <Field data-invalid={task.status === "error"}>
                  <FieldLabel htmlFor="source">原文</FieldLabel>
                  <Textarea
                    id="source"
                    variant="code"
                    required
                    spellCheck={false}
                    aria-invalid={task.status === "error"}
                    aria-describedby={
                      task.status === "error" ? "parse-error" : undefined
                    }
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                </Field>
                <Button type="submit" size="lg" disabled={busy}>
                  {busy && (
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                  )}
                  {busy ? "转换中" : "转换文档"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <Card className="min-h-96 min-w-0" aria-busy={busy}>
          <CardHeader>
            <CardTitle>
              <h2>转换结果</h2>
            </CardTitle>
            <CardDescription role="status">
              {task.status === "success"
                ? "转换完成"
                : busy
                  ? "转换中"
                  : task.status === "error"
                    ? "转换失败"
                    : "结果格式为 JSON。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {task.status === "error" ? (
              <div id="parse-error">
                <TaskError message={task.error} />
              </div>
            ) : task.status === "success" ? (
              <pre
                className="min-h-80 overflow-auto font-mono text-xs leading-7 whitespace-pre-wrap wrap-anywhere text-primary"
                aria-label="转换结果"
              >
                {JSON.stringify(task.data!.data, null, 2)}
              </pre>
            ) : (
              <TaskEmpty
                loading={busy}
                title={busy ? "转换中" : "等待转换"}
                description="转换结果显示在这里，可先试用示例。"
              />
            )}
          </CardContent>
        </Card>
      </Workspace>
    </ToolLayout>
  );
}
