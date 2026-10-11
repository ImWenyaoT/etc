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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useState } from "react";
import { useSnakeGame } from "./useSnakeGame";
import { request } from "./api";
const statuses = {
  idle: "尚未开始",
  running: "游戏中",
  paused: "已暂停",
  "game-over": "本局结束",
};
export default function App() {
  const { canvas, hud, act } = useSnakeGame();
  const [name, setName] = useState("玩家");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const restart = () => {
    act("restart");
    setSaved(false);
    setMessage("");
    setError("");
  };
  return (
    <main className="mx-auto grid min-h-svh max-w-5xl items-center px-4 py-8 md:px-8">
      <section>
        <header className="mb-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-[10px] tracking-widest text-muted-foreground">
              经典玩法
            </p>
            <h1 className="text-4xl leading-none font-semibold tracking-tight md:text-6xl">
              贪吃蛇<span className="text-primary">.</span>
            </h1>
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              {statuses[hud.status]} ·{" "}
              {hud.status === "idle"
                ? "吃到食物得分，避开墙和自己。"
                : hud.status === "game-over"
                  ? "再来一局，试试打破纪录。"
                  : "避开墙和自己，继续吃食物。"}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["本局得分", hud.score],
              ["历史最高", hud.bestScore],
            ].map(([label, value]) => (
              <div
                className="min-w-24 rounded-lg border bg-card px-4 py-3"
                key={label}
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-primary tabular-nums">
                  {value.toString().padStart(3, "0")}
                </dd>
                {label === "历史最高" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    仅记录在当前浏览器。
                  </p>
                )}
              </div>
            ))}
          </dl>
        </header>
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,560px)_minmax(220px,280px)]">
          <canvas
            ref={canvas}
            width="560"
            height="560"
            className="aspect-square h-auto w-full rounded-xl border shadow-xl"
            aria-label="游戏区域"
          >
            方向键移动，空格暂停。得分 {hud.score}。
          </canvas>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>游戏操作</h2>
              </CardTitle>
              <CardDescription>选择开始、暂停或重玩。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  disabled={hud.status !== "idle"}
                  onClick={() => act("start")}
                >
                  开始游戏
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={hud.status === "idle" || hud.status === "game-over"}
                  onClick={() => act("pause")}
                >
                  {hud.status === "paused" ? "继续游戏" : "暂停游戏"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={busy}
                  onClick={restart}
                >
                  重新开始
                </Button>
              </div>
              <div>
                <p className="text-xs leading-6 text-muted-foreground">
                  方向键或 WASD 控制方向。
                  <br />
                  空格暂停，回车开始。
                </p>
                <div
                  className="mx-auto mt-4 grid w-fit grid-cols-3 gap-2"
                  aria-label="移动方向"
                >
                  {(
                    [
                      {
                        direction: "up",
                        label: "向上",
                        Icon: ArrowUpIcon,
                        position: "col-start-2",
                      },
                      {
                        direction: "left",
                        label: "向左",
                        Icon: ArrowLeftIcon,
                        position: "row-start-2 col-start-1",
                      },
                      {
                        direction: "down",
                        label: "向下",
                        Icon: ArrowDownIcon,
                        position: "row-start-2 col-start-2",
                      },
                      {
                        direction: "right",
                        label: "向右",
                        Icon: ArrowRightIcon,
                        position: "row-start-2 col-start-3",
                      },
                    ] as const
                  ).map(({ direction, label, Icon, position }) => (
                    <Button
                      key={direction}
                      className={position}
                      variant="outline"
                      size="icon-lg"
                      aria-label={label}
                      onClick={() => act(`move-${direction}`)}
                    >
                      <Icon />
                    </Button>
                  ))}
                </div>
              </div>
              <form
                className="border-t pt-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy || saved) return;
                  setBusy(true);
                  setError("");
                  try {
                    await request("/scores", { name, score: hud.score });
                    setSaved(true);
                    setMessage("本局成绩已保存。");
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "保存失败，请再试一次。",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="player">玩家昵称</FieldLabel>
                    <Input
                      id="player"
                      required
                      maxLength={40}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    disabled={busy || saved || hud.status !== "game-over"}
                  >
                    {busy && (
                      <Spinner aria-hidden="true" data-icon="inline-start" />
                    )}
                    {busy ? "保存中" : saved ? "已保存" : "保存成绩"}
                  </Button>
                  <FieldDescription>
                    本局结束后，可以保存成绩。
                  </FieldDescription>
                  {message && (
                    <Alert role="status">
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
        <footer className="mt-6 text-xs leading-6 text-muted-foreground">
          避开墙和自己，吃到食物得分。
        </footer>
      </section>
    </main>
  );
}
