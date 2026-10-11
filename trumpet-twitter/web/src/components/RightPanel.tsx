import { useState } from "react";
import type { UserView } from "@trumpet/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
interface RightPanelProps {
  user: UserView;
  onOpenProfile: (handle: string) => void;
}
export const RightPanel = ({ user, onOpenProfile }: RightPanelProps) => {
  const [handle, setHandle] = useState("");
  return (
    <aside className="flex flex-col gap-6 p-4 md:col-start-2 xl:col-start-auto xl:p-6">
      <Card className="hidden xl:flex">
        <CardHeader>
          <CardDescription>当前账号</CardDescription>
          <CardTitle>
            <h2 className="wrap-anywhere">{user.displayName}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm wrap-anywhere text-muted-foreground">
            @{user.handle}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>查找用户</h2>
          </CardTitle>
          <CardDescription>输入完整账号，查看对方主页。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onOpenProfile(handle);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="profile-handle">对方账号</FieldLabel>
                <Input
                  id="profile-handle"
                  name="profileHandle"
                  required
                  pattern="[a-z0-9_]{3,20}"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="输入完整账号"
                />
              </Field>
              <Button type="submit">查看主页</Button>
              <FieldDescription>
                输入注册账号，查看帖子并关注。
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </aside>
  );
};
