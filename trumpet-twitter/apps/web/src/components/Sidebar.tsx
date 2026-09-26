import { Home, LogOut, UserRound } from 'lucide-react'
import type { UserView } from '@trumpet/shared'

interface SidebarProps {
  user: UserView
  onHome: () => void
  onProfile: () => void
  onLogout: () => void
}

export const Sidebar = ({ user, onHome, onProfile, onLogout }: SidebarProps) => (
  <aside className="sidebar">
    <div>
      <p className="brand-mark">Trumpet</p>
      <nav className="nav-list" aria-label="Primary navigation">
        <button type="button" onClick={onHome}>
          <Home size={18} aria-hidden="true" />
          Following
        </button>
        <button type="button" onClick={onProfile}>
          <UserRound size={18} aria-hidden="true" />
          Profile
        </button>
      </nav>
    </div>

    <div className="viewer-card">
      <div className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</div>
      <div>
        <strong>{user.displayName}</strong>
        <span>@{user.handle}</span>
      </div>
      <button className="icon-button" type="button" aria-label="退出登录" onClick={onLogout}>
        <LogOut size={18} aria-hidden="true" />
      </button>
    </div>
  </aside>
)
