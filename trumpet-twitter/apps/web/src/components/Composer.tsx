import { Send } from 'lucide-react'

interface ComposerProps {
  value: string
  placeholder?: string
  buttonLabel?: string
  isSubmitting?: boolean
  compact?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export const Composer = ({
  value,
  placeholder = 'What are you building?',
  buttonLabel = 'Post',
  isSubmitting = false,
  compact = false,
  onChange,
  onSubmit,
}: ComposerProps) => {
  const remaining = 280 - value.length

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className={compact ? 'composer compact' : 'composer'} onSubmit={submit}>
      <textarea
        id={compact ? undefined : 'post-composer'}
        name={compact ? 'reply' : 'post'}
        maxLength={280}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="composer-footer">
        <span className={remaining < 30 ? 'counter danger' : 'counter'}>{remaining}</span>
        <button
          className="primary-button small"
          type="submit"
          disabled={!value.trim() || isSubmitting}
        >
          <Send size={16} aria-hidden="true" />
          {isSubmitting ? '发送中' : buttonLabel}
        </button>
      </div>
    </form>
  )
}
