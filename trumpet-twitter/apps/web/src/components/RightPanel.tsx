import type { UserView } from '@trumpet/shared'

interface RightPanelProps {
  user: UserView
  onOpenProfile: (handle: string) => void
}

const suggestions = [
  { handle: 'leo', name: 'Leo Park', note: 'API contracts and testing' },
  { handle: 'ava', name: 'Ava Stone', note: 'Product loops and systems' },
]

export const RightPanel = ({ user, onOpenProfile }: RightPanelProps) => (
  <aside className="right-panel">
    <section className="profile-summary">
      <p className="eyebrow">Signed in</p>
      <h2>{user.displayName}</h2>
      <p>@{user.handle}</p>
    </section>

    <section>
      <h3>People to inspect</h3>
      <div className="suggestion-list">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.handle}
            type="button"
            onClick={() => onOpenProfile(suggestion.handle)}
          >
            <span>{suggestion.name}</span>
            <small>
              @{suggestion.handle} · {suggestion.note}
            </small>
          </button>
        ))}
      </div>
    </section>
  </aside>
)
