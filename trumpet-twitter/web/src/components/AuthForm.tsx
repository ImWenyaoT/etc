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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { api } from "../lib/api.js";

interface AuthFormProps {
  onAuthenticated: () => void;
}

export const AuthForm = ({ onAuthenticated }: AuthFormProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await api.register({ handle, displayName, password });
      } else {
        await api.login({ handle, password });
      }

      onAuthenticated();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "登录失败，请再试一次。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-svh place-items-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="mb-4 text-2xl font-bold text-primary">
            Trumpet
          </p>
          <CardTitle>
            <h1>分享近况</h1>
          </CardTitle>
          <CardDescription>关注感兴趣的人，分享你的近况。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ToggleGroup
            value={[mode]}
            onValueChange={(values) => {
              if (values[0] === "login" || values[0] === "register") {
                setMode(values[0]);
                setError(null);
              }
            }}
            variant="outline"
            aria-label="登录注册"
          >
            <ToggleGroupItem value="login" disabled={isSubmitting}>
              登录
            </ToggleGroupItem>
            <ToggleGroupItem value="register" disabled={isSubmitting}>
              注册
            </ToggleGroupItem>
          </ToggleGroup>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="auth-handle">账号</FieldLabel>
                <Input
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-z0-9_]+"
                  id="auth-handle"
                  name="handle"
                  autoComplete="username"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  aria-describedby="auth-handle-hint"
                />
                <FieldDescription id="auth-handle-hint">
                  3～20位，仅限小写字母、数字和_。
                </FieldDescription>
              </Field>
              {mode === "register" && (
                <Field>
                  <FieldLabel htmlFor="auth-display-name">昵称</FieldLabel>
                  <Input
                    required
                    maxLength={80}
                    id="auth-display-name"
                    name="displayName"
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="auth-password">密码</FieldLabel>
                <Input
                  required
                  minLength={8}
                  maxLength={72}
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting && (
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                )}
                {isSubmitting
                  ? "提交中"
                  : mode === "login"
                    ? "登录"
                    : "注册账号"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};
