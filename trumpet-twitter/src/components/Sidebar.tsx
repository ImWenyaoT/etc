import { Home, LogOut, UserRound } from "lucide-react";
import type { UserView } from "@trumpet/shared";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
interface SidebarProps {
  user: UserView;
  active: "home" | "profile";
  onHome: () => void;
  onProfile: () => void;
  onLogout: () => void;
}
export const Sidebar = ({
  user,
  active,
  onHome,
  onProfile,
  onLogout,
}: SidebarProps) => (
  <aside className="flex flex-col gap-4 border-b bg-background p-4 md:sticky md:top-0 md:min-h-svh md:justify-between md:self-start md:border-b-0 md:border-r md:p-5">
    <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch md:gap-5">
      <p className="text-2xl font-extrabold tracking-tight text-primary">
        Trumpet
      </p>
      <nav className="flex gap-1 md:flex-col md:gap-2" aria-label="主要菜单">
        <Button
          variant={active === "home" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={onHome}
          aria-current={active === "home" ? "page" : undefined}
        >
          <Home data-icon="inline-start" />
          关注动态
        </Button>
        <Button
          variant={active === "profile" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={onProfile}
          aria-current={active === "profile" ? "page" : undefined}
        >
          <UserRound data-icon="inline-start" />
          我的主页
        </Button>
      </nav>
    </div>
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card p-2">
      <Avatar>
        <AvatarFallback>
          {user.displayName.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{user.displayName}</strong>
        <span className="block truncate text-xs text-muted-foreground">
          @{user.handle}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="退出登录"
        onClick={onLogout}
      >
        <LogOut />
      </Button>
    </div>
  </aside>
);
