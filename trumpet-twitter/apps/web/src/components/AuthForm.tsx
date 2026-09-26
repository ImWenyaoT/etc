import { useState } from 'react'
import { api } from '../lib/api.js'

interface AuthFormProps {
  onAuthenticated: () => void
}

export const AuthForm = ({ onAuthenticated }: AuthFormProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [handle, setHandle] = useState('mina')
  const [displayName, setDisplayName] = useState('Mina Chen')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        await api.register({ handle, displayName, password })
      } else {
        await api.login({ handle, password })
      }

      onAuthenticated()
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : '登录失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <p className="brand-mark">Trumpet</p>
          <h1>用一个小号 Twitter 练完整全栈闭环</h1>
          <p className="muted">
            本地账号、关注流、发帖和点赞都接真实 SQLite。可以先运行 seed，然后用 mina / password123
            登录。
          </p>
        </div>

        <div className="segmented">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        <form className="stack" onSubmit={submit}>
          <label>
            <span>Handle</span>
            <input
              id="auth-handle"
              name="handle"
              autoComplete="username"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
            />
          </label>

          {mode === 'register' ? (
            <label>
              <span>显示名</span>
              <input
                id="auth-display-name"
                name="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          ) : null}

          <label>
            <span>密码</span>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '处理中...' : mode === 'login' ? '登录' : '创建账号'}
          </button>
        </form>
      </section>
    </main>
  )
}
