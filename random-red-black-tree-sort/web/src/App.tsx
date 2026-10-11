import { useState } from "react";
import { useTask } from "./useTask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  ToolLayout,
  Workspace,
  TaskError,
  TaskEmpty,
} from "@/components/tool-layout";
interface Result {
  elementCount: number;
  insertTimeMs: number;
  traversalTimeMs: number;
  treeHeight: number;
  rotations: number;
  recolors: number;
  blackHeight: number;
  validRedBlackTree: boolean;
  sortedOutput: boolean;
  firstValues: number[];
  lastValues: number[];
  validationErrors: string[];
}

export default function App() {
  const [count, setCount] = useState(10000);
  const [seed, setSeed] = useState(42);
  const task = useTask<Result>();
  const r = task.data;
  const busy = task.status === "loading";
  return (
    <ToolLayout
      brand="排序实验"
      index="算法工具"
      eyebrow="查看排序"
      title="排序实验"
      description="打乱数字再排序，查看用时和检查结果。"
      footer="打乱后逐个放入，排序并检查规则。"
    >
      <Workspace>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>排序设置</h2>
            </CardTitle>
            <CardDescription>左倾红黑树（LLRB）<br />让查找和排序保持高效的一种结构。</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void task.run("/sort", { count, seed });
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="count">数字个数</FieldLabel>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="1000000"
                    required
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    aria-describedby="count-hint"
                  />
                  <FieldDescription id="count-hint">
                    1～100万个整数，互不重复。
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="seed">随机种子</FieldLabel>
                  <Input
                    id="seed"
                    type="number"
                    min="0"
                    max="4294967295"
                    required
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    aria-describedby="seed-hint"
                  />
                  <FieldDescription id="seed-hint">
                    用于重现同一次打乱。
                    <br />
                    种子和个数相同，顺序相同。
                  </FieldDescription>
                </Field>
                <Button type="submit" size="lg" disabled={busy}>
                  {busy && (
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                  )}
                  {busy ? "排序中" : "开始排序"}
                </Button>
                <FieldDescription>
                  用时受运行电脑影响，仅供比较。
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <Card className="min-h-96 min-w-0" aria-busy={busy}>
          <CardHeader>
            <CardTitle>
              <h2>排序结果</h2>
            </CardTitle>
            <CardDescription role="status">
              {r
                ? `共 ${r.elementCount.toLocaleString()} 个数字`
                : busy
                  ? "排序中"
                  : task.status === "error"
                    ? "排序失败"
                    : "等待排序"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {task.status === "error" ? (
              <TaskError message={task.error} />
            ) : r ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={r.validRedBlackTree ? "secondary" : "destructive"}
                  >
                    {r.validRedBlackTree ? "✓" : "✗"} 规则检查
                  </Badge>
                  <Badge variant={r.sortedOutput ? "secondary" : "destructive"}>
                    {r.sortedOutput ? "✓" : "✗"} 顺序检查
                  </Badge>
                  <Badge variant="outline">黑高 {r.blackHeight}</Badge>
                </div>
                <div className="text-xs leading-6 text-muted-foreground">
                  <p>规则检查：检查是否符合红黑树的全部规则。</p>
                  <p>顺序检查：检查数字是否从小到大排列。</p>
                  <p>黑高：从树根到空节点，黑色节点的个数。</p>
                  <p>包含树根和末端空节点。</p>
                </div>
                <dl className="grid grid-cols-2 gap-6 border-y py-6">
                  {[
                    [
                      "插入用时",
                      r.insertTimeMs.toFixed(2),
                      "ms",
                      "将数字逐个放进树中所用的时间。",
                    ],
                    [
                      "读取用时",
                      r.traversalTimeMs.toFixed(2),
                      "ms",
                      "按从小到大的顺序读完数字的时间。",
                    ],
                    ["树高", r.treeHeight, "层", "树从上到下的最大层数。"],
                    [
                      "旋转次数",
                      r.rotations.toLocaleString(),
                      "次",
                      "为保持平衡，调整节点位置的次数。",
                    ],
                  ].map(([label, value, unit, explanation]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                        {value}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {unit}
                        </span>
                      </dd>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {explanation}
                      </p>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs text-muted-foreground">开头数字</h3>
                  <p className="font-mono text-xs leading-7 wrap-anywhere">
                    {r.firstValues.join(" → ")}
                  </p>
                  <h3 className="text-xs text-muted-foreground">末尾数字</h3>
                  <p className="font-mono text-xs leading-7 wrap-anywhere">
                    {r.lastValues.join(" → ")}
                  </p>
                </div>
                <details className="border-t pt-4 text-sm">
                  <summary className="cursor-pointer py-2">详细结果</summary>
                  <pre
                    className="mt-4 overflow-auto text-xs leading-6 whitespace-pre-wrap wrap-anywhere"
                    aria-label="排序结果"
                  >
                    {JSON.stringify(r, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <TaskEmpty
                loading={busy}
                title={busy ? "排序中" : "等待排序"}
                description="设置数字个数，查看排序和检查结果。"
              />
            )}
          </CardContent>
        </Card>
      </Workspace>
    </ToolLayout>
  );
}
